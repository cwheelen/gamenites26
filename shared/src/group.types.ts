import { z } from "zod";

export interface GroupChatInfo {
  groupId: string;
  title: string;
  members: string[]; // list of usernames
  chatId: string;
  createdBy: string; // username of creator
  lastUpdated: string; // ISO date string
}

export type CreateGroupChat = z.infer<typeof zCreateGroupChat>;
export const zCreateGroupChat = z.object({
  title: z.string(),
  members: z.array(z.string()).min(2), // list of usernames to add to the group chat
});

export type UpdateGroupChat = z.infer<typeof zUpdateGroupChat>;
export const zUpdateGroupChat = z.object({
  groupId: z.string(),
  title: z.string().optional(),
  members: z.array(z.string()).min(2).optional(),
});
