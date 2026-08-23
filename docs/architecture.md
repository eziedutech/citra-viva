# Architecture notes

Why the system is shaped the way it is. The high-level diagram lives in the [README](../README.md); this document covers the decisions behind it.

## The reasoning loop

CITRA Viva is four narrow agents and one coordinator, not one large agent with many instructions. Each stage transforms its input into something that did not exist before:

| Stage | Input | Output |
|---|---|---|
| Draft Analyzer | Raw manuscript text | Weakness Map, evidence-anchored |
| Question Strategy | Weakness Map plus prior-session history | An ordered interrogation plan |
| Examiner Session | A question and the student's answer | A decision: press deeper, move on, or record a gap |
| Session Reflection | The full transcript | An updated cross-session weakness profile |

The first two stages are implemented.

The Weakness Map is the interesting artifact. It is not a summary of the draft; the student already knows what they wrote. It is a synthesis nobody has ever written down, including the student's own supervisor: an explicit map of where the argument gives way under pressure.

## Anchoring, applied twice

The same discipline runs through both agents built so far, at different levels.

| Agent | Claim it makes | What it must be anchored to |
|---|---|---|
| Draft Analyzer | "an examiner will attack this" | A verbatim quote from the manuscript |
| Question Strategy | "so I will ask this" | A finding in the Weakness Map |

In both cases an unanchored item is dropped and the reason is recorded. The motivation is the same at both levels: when a student asks why a question was asked, the chain has to run all the way back to a sentence they actually wrote. A tool built on research integrity cannot answer that question with "the model felt like it".

There is a deliberate exception. Opening and closing questions address the work as a whole, so they are allowed to stand without a finding behind them. An unrecognized question type falls back to `probe` rather than to `opening`, which keeps it inside the anchoring requirement instead of letting an unknown label become an escape hatch.

## What cannot be verified is bounded instead

Not every model claim can be checked. Whether a question revisits a gap from an earlier session is a semantic judgment, and no string comparison settles it.

The response is to bound the damage rather than pretend to verify. The model may assert `targets_recurring_gap`, and a content word overlap check offers a second route to the same conclusion. The one part that is genuinely verifiable is enforced absolutely: if no prior gaps were supplied, nothing can target one, whatever the model says. And the flag only reorders questions, so a wrong answer costs a position in the sequence rather than a false accusation.

This is the general shape: verify what can be verified, bound what cannot, and never let an unverifiable claim reach a place where being wrong would harm the student.

## Separation of concerns is enforced, not requested

Sub-agents do not call each other. Every exchange goes through the Orchestrator, and durable state goes through Firestore.

On the Draft Analyzer this is enforced by the framework rather than by convention:

```python
LlmAgent(
    name="draft_analyzer",
    output_schema=WeaknessMap,
    disallow_transfer_to_parent=True,
    disallow_transfer_to_peers=True,
)
```

ADK itself refuses a handoff from the Draft Analyzer to the Examiner Session Agent, and the Question Strategy Agent is locked down the same way. The isolation does not depend on whoever writes the next module remembering the rule.

The rule extends to plain Python too. When both agents needed the same text helpers, those helpers went into `app/common/text.py` rather than one agent importing from the other, because a shared utility is not a reason to create exactly the coupling the architecture forbids.

A useful side effect: an ADK agent bound to an `output_schema` is not allowed to hold tools. The Draft Analyzer needs no tools, so that restriction costs nothing and buys a tighter blast radius.

## Pure core, thin framework wrapper

The Draft Analyzer is split in two:

- `core.py` is plain Python. It accepts an injected `ModelRunner`, a protocol with exactly one method.
- `adk_agent.py` registers the agent with ADK and does nothing else.

Both go through the same `build_weakness_map()`, so the validation rules cannot drift apart between the API path and the ADK path.

The payoff is testing. The entire unit suite runs with a fake runner: no network, no credentials, no spend, and no failures caused by quota or region. Tests that need the real model are isolated in `test_draft_analyzer_live.py` and skipped unless `CITRA_RUN_LIVE_TESTS=1` is set.

## Handling a model that is confidently wrong

A hallucinated quote is not a cosmetic defect here. The product tells a student "an examiner will attack this sentence of yours." If the sentence is not theirs, the tool has accused them of something they did not write, inside a product whose entire premise is research integrity.

So the pipeline assumes the model can be wrong and is built to contain it:

| Failure mode | Response |
|---|---|
| Invented quote | Dropped. Matching is normalized (whitespace, curly quotes, dashes, case) and then compared against every sentence and sentence pair in the draft, with a 0.85 similarity floor. |
| Quote transcribed with small differences | Snapped back to the manuscript's own wording rather than rejected. Models routinely paraphrase slightly, and discarding those would throw away valid findings. |
| Finding with no explanation | Dropped, never backfilled with placeholder text. Meaningless rows fill the screen and train people to stop reading the list. |
| Category outside the enum | Neutralized to `other`. The message is still useful; only the label is untrustworthy. |
| Unrecognized severity | Falls to `low`, never rises. Alarming an author about something nobody asserted is the more expensive error. |
| Duplicate findings | Deduplicated on the matched quote. |
| Response that is not JSON | Rejected with a clear error, after first attempting to recover a JSON object from surrounding prose. |

Every rejection is recorded with its reason in `dropped`. Silent filtering would break auditability: the system must be able to say what the model claimed and why we refused it.

## State that survives a restart

A defense session that drops halfway must resume from where it stopped rather than starting over. `VivaSessionDoc` carries `current_question_index` alongside the transcript and the strategy, so resumption needs no in-memory context.

Persistence is also non-fatal by design. `Orchestrator.run_draft_analysis` logs a Firestore write failure and still returns the analysis. During a live, unedited demo, a database hiccup must not throw away a result that is already in hand.

## Model access

Calls go through `client.models.generate_content` with a Pydantic `response_schema`. Google's documentation names this the recommended path for stable deployments, and stability outranks novelty for a demo recorded in one take.

The newer Interactions API keeps conversation state server-side through `previous_interaction_id`, which maps closely onto what the Examiner Session Agent will need. It is worth reconsidering at that point. The Draft Analyzer is a single-shot call and gains nothing from it.

## Data handling

Manuscript text is never written to Firestore, only its character count. The document itself stays in this project's Cloud Storage bucket. No third party sees the draft beyond Google Cloud and the Gemini API.

## Deployment

Two targets, not one:

- **Cloud Run** hosts the FastAPI service. `codes/backpy/Dockerfile` builds it.
- **Agent Runtime** hosts the ADK agent through `agent_engines.AdkApp`, which is a separate path and not the same container image.

## Cross-session memory

Agent Platform provides a managed **Memory Bank** service with a dedicated ADK quickstart. That is exactly the cross-session memory the product calls for, so the intent is to evaluate the managed service before hand-rolling anything on top of Firestore.
