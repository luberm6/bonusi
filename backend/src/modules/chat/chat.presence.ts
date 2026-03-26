const socketsByUser = new Map<string, Set<string>>();

export function markUserSocketOnline(userId: string, socketId: string) {
  const current = socketsByUser.get(userId) ?? new Set<string>();
  current.add(socketId);
  socketsByUser.set(userId, current);
}

export function markUserSocketOffline(userId: string, socketId: string) {
  const current = socketsByUser.get(userId);
  if (!current) return;
  current.delete(socketId);
  if (current.size === 0) socketsByUser.delete(userId);
}

export function isUserOnline(userId: string): boolean {
  return (socketsByUser.get(userId)?.size ?? 0) > 0;
}
