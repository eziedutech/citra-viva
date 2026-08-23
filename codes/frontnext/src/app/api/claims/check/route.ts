import { NextRequest, NextResponse } from 'next/server';

import { post } from '@/lib/api';
import type { ClaimSupportResult } from '@/lib/types';
import { toErrorResponse } from '../../sessions/_shared';

export const maxDuration = 120;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    return NextResponse.json(
      await post<ClaimSupportResult>('/api/claims/check', {
        claim: body.claim ?? '',
        source: body.source ?? {},
      }),
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}
