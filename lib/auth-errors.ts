// Error codes the credentials provider can throw. Shared by the server's
// authorize() and the login form, which receives the code as
// `signIn(...).error`. Kept free of server imports so the form can use it.
export const TOO_MANY_LOGIN_ATTEMPTS = "TooManyLoginAttempts";
