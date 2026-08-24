import { NextRequest, NextResponse } from 'next/server';

import { post } from '@/lib/api';
import type { QuestionRubric } from '@/lib/types';
import { toErrorResponse } from '../../_shared';

export async function POST(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    return NextResponse.json(await post<QuestionRubric>(`/api/sessions/${id}/rubric`, {}));
  } catch (error) {
    return toErrorResponse(error);
  }
}
