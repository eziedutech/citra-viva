import { NextResponse } from 'next/server';

import { post } from '@/lib/api';
import type { CloseSessionResponse } from '@/lib/types';
import { toErrorResponse } from '../../_shared';

export const maxDuration = 300;

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    return NextResponse.json(await post<CloseSessionResponse>(`/api/sessions/${id}/close`, {}));
  } catch (error) {
    return toErrorResponse(error);
  }
}
