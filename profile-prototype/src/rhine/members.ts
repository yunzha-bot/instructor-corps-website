import type { ArchiveRecord } from './data';
import type { Profile } from '../data';

// Local prototype identity; real sessions and write authorization belong on the server.
export const CURRENT_MEMBER_ID = 'demo-self';
export const legacyProfileIds = Array.from({length:7},(_,i)=>`X-${String(i+2).padStart(3,'0')}`);
export const demoMembers = Array.from({length:7},(_,i)=>({
  id:`T-${String(i+2).padStart(3,'0')}`, ownerId:`demo-member-${i+2}`,
  profile:{nickname:`演示队员 ${String(i+2).padStart(2,'0')}`,bio:''} as Profile,
}));
export function canEditArchive(record: ArchiveRecord) { return record.ownerId === CURRENT_MEMBER_ID; }
export function isOwnMember(record: ArchiveRecord) { return !!record.memberRecord && canEditArchive(record); }
export function canEditRecordPart(record: ArchiveRecord,id: string) {
  return canEditArchive(record) && (record.id === id || isOwnMember(record) && legacyProfileIds.includes(id));
}
