import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
const artists = defineCollection({ loader: glob({ pattern: '*.json', base: './src/content/artists' }), schema: z.object({ name:z.string(), slug:z.string(), format:z.enum(['dj','live','b2b','hybrid']), origin:z.string(), setStart:z.string(), setEnd:z.string(), bpm:z.string().optional(), genre:z.string().optional(), photo:z.string(), links:z.object({ soundcloud:z.string().url().optional(), instagram:z.string().url().optional(), ra:z.string().url().optional() }), order:z.number() }) });
export const collections = { artists };
