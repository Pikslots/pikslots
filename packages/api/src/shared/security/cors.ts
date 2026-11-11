export function buildCorsOriginMatchers(corsOrigins: string[]): RegExp[] {
  return corsOrigins.map(
    (pattern) =>
      new RegExp(
        `^${pattern
          .split('*')
          .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
          .join('.*')}$`,
      ),
  );
}

export function isAllowedOrigin(
  origin: string | undefined,
  matchers: RegExp[],
): boolean {
  // requests with no origin (e.g. curl, server-to-server) are allowed
  return !origin || matchers.some((re) => re.test(origin));
}
