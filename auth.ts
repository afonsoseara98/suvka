import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "@/app/lib/prisma";
import { checkLoginAttempt } from "@/app/lib/authThrottle";
import { clientAddress } from "@/app/lib/rateLimit";

// Devolver null daria "email ou password errados", e mandava um dono de restaurante que se
// enganou tentar outra vez, mais depressa, contra um travão que ele não sabe que existe.
// O `code` chega ao cliente e é lá que vira uma frase em português.
class TooManyAttempts extends CredentialsSignin {
  code = "demasiadas_tentativas";
}

// Credentials provider only for this pass (see docs/suvka-product-blueprint-v1.md
// §17's ADR on this) - no external OAuth app registration needed to get a working
// end-to-end loop with just a database connection string. Adding Google/GitHub/etc.
// later is a `providers` array entry, not a restructuring of this file.
//
// Credentials requires `session: { strategy: "jwt" }` - Auth.js's database session
// strategy only works with providers that don't need a bespoke `authorize` step.
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  // WITHOUT THIS, NOTHING SIGNS IN ONCE THIS IS DEPLOYED
  //
  // Auth.js v5 refuses to answer at all when it cannot verify the host it was reached on -
  // "UntrustedHost" - unless the deployment says the host can be trusted. It is only lenient
  // on Vercel, which sets its own signal; on any self-hosted box it throws.
  //
  // `next dev` hides this completely. It first appeared running `next start` locally: every
  // call to /api/auth/session returned "There was a problem with the server configuration",
  // so useSession() reported nobody was signed in, and publishing asked an already-signed-in
  // owner to create an account again. On the real VPS that would have been every account,
  // on day one.
  //
  // Trusting the Host header is only sound because Caddy terminates every request and serves
  // exactly one domain (see deploy/Caddyfile). A future setup that forwards arbitrary Host
  // headers would need AUTH_URL pinned instead.
  trustHost: true,
  pages: {
    signIn: "/",
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, request) {
        const email = typeof credentials?.email === "string" ? credentials.email : undefined;
        const password = typeof credentials?.password === "string" ? credentials.password : undefined;
        if (!email || !password) return null;

        // ANTES DO BCRYPT, SEMPRE.
        //
        // 439 ms de CPU por tentativa, medidos, num processo que também serve todos os
        // sites publicados. Contar as tentativas depois de as pagar seria contabilidade,
        // não defesa: o recurso que se está a proteger já tinha sido gasto.
        const attempt = await checkLoginAttempt({ address: clientAddress(request), email });
        if (!attempt.allowed) throw new TooManyAttempts();

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.passwordHash) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
  callbacks: {
    // Credentials + JWT sessions: the user id has to be threaded through the token
    // manually (Auth.js doesn't do this automatically outside the database strategy).
    async jwt({ token, user }) {
      if (user?.id) {
        token.sub = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
});
