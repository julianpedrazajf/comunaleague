import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { supabase } from './supabase';

function getExt(uri: string): string {
  const match = uri.match(/\.(\w+)(\?|$)/);
  const ext = match ? match[1].toLowerCase() : 'jpg';
  return ext === 'jpeg' ? 'jpg' : ext;
}

// Turn a picked image URI into an upload-ready body. On web the picker returns a
// blob:/data: URL and expo-file-system is unavailable, so fetch the blob
// directly. On native, read the file:// URI as base64 and convert to bytes.
async function readImage(uri: string): Promise<{ body: Blob | Uint8Array; contentType: string }> {
  if (Platform.OS === 'web') {
    const blob = await (await fetch(uri)).blob();
    return { body: blob, contentType: blob.type || `image/${getExt(uri)}` };
  }

  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const binaryStr = atob(base64);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  return { body: bytes, contentType: `image/${getExt(uri)}` };
}

async function uploadToStorage(bucket: string, path: string, uri: string): Promise<string> {
  const { body, contentType } = await readImage(uri);

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, body, { upsert: true, contentType });
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
