export interface KisServerRouteGuardResult {
  allowed: boolean;
  status: number;
  message?: string;
}

function parseBoolean(value: string | undefined) {
  return ["1", "true", "yes", "y"].includes((value ?? "").toLowerCase());
}

function hostNameFromHeader(value: string | null) {
  if (!value) return "";
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return "";
  if (trimmed.startsWith("[")) {
    const endBracket = trimmed.indexOf("]");
    return endBracket > 0 ? trimmed.slice(1, endBracket) : trimmed;
  }
  return trimmed.split(":")[0];
}

function hostNameFromOrigin(value: string | null) {
  if (!value) return "";
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return "";
  }
}

function isLocalHost(host: string) {
  return (
    host === "localhost" ||
    host === "::1" ||
    host === "0.0.0.0" ||
    host === "127.0.0.1" ||
    host.startsWith("127.")
  );
}

function forwardedAddressIsLocal(value: string | null) {
  if (!value) return true;
  return isLocalHost(hostNameFromHeader(value.split(",")[0]));
}

function blocked(message: string): KisServerRouteGuardResult {
  return {
    allowed: false,
    status: 403,
    message
  };
}

export function validateKisServerRouteRequest(
  request: Request
): KisServerRouteGuardResult {
  if (parseBoolean(process.env.KIS_ALLOW_NON_LOCAL_SERVER_ROUTES)) {
    return { allowed: true, status: 200 };
  }

  const host = hostNameFromHeader(request.headers.get("host"));
  if (!isLocalHost(host)) {
    return blocked(
      "KIS 서버 route는 기본적으로 localhost에서만 사용할 수 있습니다. 공개 배포에서 사용하려면 사용자 인증을 먼저 붙이거나 KIS_ALLOW_NON_LOCAL_SERVER_ROUTES=true를 명시적으로 설정하세요."
    );
  }

  const forwardedFor =
    request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip");
  if (!forwardedAddressIsLocal(forwardedFor)) {
    return blocked("외부 네트워크에서 들어온 KIS 서버 route 호출을 차단했습니다.");
  }

  const originHost = hostNameFromOrigin(request.headers.get("origin"));
  if (originHost && originHost !== host) {
    return blocked("요청 origin과 host가 달라 KIS 서버 route 호출을 차단했습니다.");
  }

  return { allowed: true, status: 200 };
}
