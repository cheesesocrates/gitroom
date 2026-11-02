import { VALID_LOGIN } from '@/lib/github-rest';
import { readSettings, reply, replyError } from '@/lib/server-github';

// The owner's newest house file from <login>/<login>/.gitroom/, checked and cleaned. Cached for a minute, so a fresh commit shows up fast.
export async function GET(request, { params }) {
  const { login } = await params;
  if (!VALID_LOGIN.test(login)) return reply({ error: "That isn't a valid GitHub username." }, { status: 400 });
  try {
    return reply(await readSettings(login), { cdn: 60, swr: 300 });
  } catch (e) {
    return replyError(e, 'settings');
  }
}
