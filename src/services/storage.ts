import * as FileSystem from 'expo-file-system';
import { supabase } from './supabase';

function getExt(uri: string): string {
  const match = uri.match(/\.(\w+)(\?|$)/);
  const ext = match ? match[1].toLowerCase() : 'jpg';
  return ext === 'jpeg' ? 'jpg' : ext;
}

async function uploadToStorage(bucket: string, path: string, uri: string): Promise<string> {
  const ext = getExt(uri);
  const contentType = `image/${ext}`;

  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const binaryStr = atob(base64);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, bytes, { upsert: true, contentType });
  if (error) throw error;

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  // Cache-bust so the Image component reloads the updated photo
  return `${data.publicUrl}?t=${Date.now()}`;
}

export async function uploadAvatar(userId: string, uri: string): Promise<string> {
  const ext = getExt(uri);
  return uploadToStorage('avatars', `${userId}/avatar.${ext}`, uri);
}

export async function uploadTeamBadge(teamId: string, uri: string): Promise<string> {
  const ext = getExt(uri);
  return uploadToStorage('team-badges', `${teamId}/badge.${ext}`, uri);
}
