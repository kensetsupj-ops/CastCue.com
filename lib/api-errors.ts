import { NextResponse } from "next/server";

/**
 * API Error Response Utility
 *
 * Provides consistent error responses across all API endpoints:
 * - User-facing error messages in Japanese
 * - Error codes for i18n support
 * - Internal logging in English
 */

export type ErrorCode =
  | "UNAUTHORIZED"
  | "NOT_AUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "VALIDATION_ERROR"
  | "X_CONNECTION_NOT_FOUND"
  | "TEMPLATE_NOT_FOUND"
  | "DRAFT_NOT_FOUND"
  | "DRAFT_ALREADY_PROCESSED"
  | "STREAM_NOT_FOUND"
  | "INVALID_SIGNATURE"
  | "RATE_LIMIT_EXCEEDED"
  | "SERVER_ERROR"
  | "BAD_REQUEST";

interface ErrorResponse {
  error: string; // 日本語のユーザー向けメッセージ
  error_code: ErrorCode; // i18n用のエラーコード
  details?: string; // 追加の詳細情報（オプション）
}

/**
 * Create a standardized error response
 */
export function createErrorResponse(
  errorCode: ErrorCode,
  message: string,
  status: number,
  details?: string
): NextResponse<ErrorResponse> {
  const response: ErrorResponse = {
    error: message,
    error_code: errorCode,
  };

  if (details) {
    response.details = details;
  }

  return NextResponse.json(response, { status });
}

/**
 * Common error responses
 */
export const ApiErrors = {
  /**
   * 401 Unauthorized - Supabase セッションが存在しない
   */
  notAuthenticated: (details?: string) =>
    createErrorResponse(
      "NOT_AUTHENTICATED",
      "認証が必要です",
      401,
      details || "ログインしてから、もう一度お試しください。"
    ),

  /**
   * 401 Unauthorized - トークンが無効または期限切れ
   */
  unauthorized: (details?: string) =>
    createErrorResponse(
      "UNAUTHORIZED",
      "認証に失敗しました",
      401,
      details || "再度ログインしてください。"
    ),

  /**
   * 403 Forbidden - 認証済みだが権限がない
   */
  forbidden: (details?: string) =>
    createErrorResponse(
      "FORBIDDEN",
      "アクセスが拒否されました",
      403,
      details || "このリソースへのアクセス権限がありません。"
    ),

  /**
   * 404 Not Found - リソースが見つからない
   */
  notFound: (resourceType: string, details?: string) =>
    createErrorResponse(
      "NOT_FOUND",
      `${resourceType}が見つかりません`,
      404,
      details
    ),

  /**
   * 404 Template Not Found
   */
  templateNotFound: (details?: string) =>
    createErrorResponse(
      "TEMPLATE_NOT_FOUND",
      "テンプレートが見つかりません",
      404,
      details
    ),

  /**
   * 404 Draft Not Found
   */
  draftNotFound: (details?: string) =>
    createErrorResponse(
      "DRAFT_NOT_FOUND",
      "投稿案が見つかりません",
      404,
      details || "投稿案が既に削除されているか、アクセス権限がありません。"
    ),

  /**
   * 404 Stream Not Found
   */
  streamNotFound: (details?: string) =>
    createErrorResponse(
      "STREAM_NOT_FOUND",
      "配信が見つかりません",
      404,
      details
    ),

  /**
   * 400 X Connection Not Found
   */
  xConnectionNotFound: () =>
    createErrorResponse(
      "X_CONNECTION_NOT_FOUND",
      "X連携が見つかりません",
      400,
      "Xアカウントを連携してから、もう一度お試しください。"
    ),

  /**
   * 409 Conflict - Draft already processed
   */
  draftAlreadyProcessed: () =>
    createErrorResponse(
      "DRAFT_ALREADY_PROCESSED",
      "この投稿は既に処理されています",
      409,
      "Draft was already processed by another request"
    ),

  /**
   * 409 Conflict - 一般的な競合エラー
   */
  conflict: (message: string, details?: string) =>
    createErrorResponse("CONFLICT", message, 409, details),

  /**
   * 400 Bad Request - バリデーションエラー
   */
  validationError: (details: string) =>
    createErrorResponse(
      "VALIDATION_ERROR",
      "入力内容に誤りがあります",
      400,
      details
    ),

  /**
   * 400 Bad Request - 一般的な不正なリクエスト
   */
  badRequest: (message: string, details?: string) =>
    createErrorResponse("BAD_REQUEST", message, 400, details),

  /**
   * 403 Invalid Signature
   */
  invalidSignature: () =>
    createErrorResponse(
      "INVALID_SIGNATURE",
      "署名の検証に失敗しました",
      403,
      "Invalid webhook signature"
    ),

  /**
   * 429 Rate Limit Exceeded
   */
  rateLimitExceeded: (details?: string) =>
    createErrorResponse(
      "RATE_LIMIT_EXCEEDED",
      "リクエスト制限を超過しました",
      429,
      details || "しばらく待ってから、もう一度お試しください。"
    ),

  /**
   * 500 Internal Server Error
   */
  serverError: (error: Error | string, includeDetails: boolean = false) => {
    const errorMessage = error instanceof Error ? error.message : error;
    return createErrorResponse(
      "SERVER_ERROR",
      "サーバーエラーが発生しました",
      500,
      includeDetails ? errorMessage : "問題が解決しない場合は、お問い合わせください。"
    );
  },
};
