import { VALID_LOGIN } from '@/lib/github-rest';
import { readPage } from '@/lib/page';
import { reply } from '@/lib/server-github';

// The contribution calendar and achievements, for browsers that build a house themselves (they can't read github.com pages).
export async function GET(request, { params }) {
  const { login } = await params;
  if (!VALID_LOGIN.test(login)) return reply({ error: "That isn't a valid GitHub username." }, { status: 400 });
  const page = await readPage(login);
  return reply(page, page.calendar ? { cdn: 21600, swr: 86400, browser: 300 } : { cdn: 300, swr: 300 });
}
