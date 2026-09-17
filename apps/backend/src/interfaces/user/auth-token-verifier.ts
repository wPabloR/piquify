export interface AuthTokenVerifier {
  verify(token: string): Promise<{ userId: string }>;
}
