import { VALID_LOGIN, readGitHub } from '@/lib/github-rest';
import { buildProfile } from '@/lib/analyze';
import { readPage } from '@/lib/page';
import { readReposPages } from '@/lib/repo-page';
import { cached, readSettings, reply, replyError } from '@/lib/server-github';

// big accounts read a dozen repo pages; GitHub usually answers in a few seconds
export const maxDuration = 30;

// A whole house, built from public data with no token: three API calls (user, repos, house file) plus the repos'
// public web pages. The CDN keeps it for six hours, so most visits never reach GitHub. When this server has used up
// GitHub's free API quota, the answer is 503 "rate" and the visitor's browser makes those three calls itself.
export async function GET(request, { params }) {
  const { login } = await params;
  if (!VALID_LOGIN.test(login)) return reply({ error: "That isn't a valid GitHub username.", code: 'invalid' }, { status: 400 });
  try {
    // the owner's room picks decide which repos get counted, so the house file comes first (it's one quick read)
    const own = await readSettings(login).catch(() => ({ settings: null }));
    const [gh, page] = await Promise.all([
      readGitHub(login, { ...cached, details: (owner, list, onEach) => readReposPages(owner, list, cached.raw, onEach), rooms: (own.settings && own.settings.rooms) || [] }),
      readPage(login),
    ]);
    return reply({ profile: buildProfile(gh, page) }, { cdn: 21600, swr: 86400, browser: 300 });
  } catch (e) {
    return replyError(e, 'house');
  }
}
