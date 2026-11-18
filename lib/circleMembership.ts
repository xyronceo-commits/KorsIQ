// "Is this circle one of the user's own circles?"
//
// The database lets every signed-in user SEE all public/general circles (so they can be browsed and joined),
// but being able to see a circle does not make you a member of it. Anything that builds "my circles" must
// filter with this check, otherwise other people's general circles show up as already joined.

type MemberEntry = string | { userId?: string; user_id?: string } | null | undefined;

export interface CircleLike {
  id: string;
  owner_id?: string | null;
  ownerId?: string | null;
  members?: unknown;
}

function memberEntryIsUser(entry: MemberEntry, userId: string): boolean {
  if (!entry) return false;
  if (typeof entry === 'string') return entry === userId;
  return entry.userId === userId || entry.user_id === userId;
}

export function isUserCircle(
  circle: CircleLike,
  userId: string,
  memberCircleIds: ReadonlySet<string> = new Set()
): boolean {
  if (!circle || !userId) return false;
  if ((circle.owner_id ?? circle.ownerId) === userId) return true;
  if (memberCircleIds.has(circle.id)) return true;
  const members = Array.isArray(circle.members) ? (circle.members as MemberEntry[]) : [];
  return members.some((m) => memberEntryIsUser(m, userId));
}
