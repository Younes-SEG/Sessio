import { expect, it } from 'vitest';
import { brightspaceEventIdentity } from '../src/lib/calendar-identity';

it('matches provider event IDs across translated descriptions and query parameters', () => {
  const path = 'https://school.brightspace.com/d2l/le/calendar/42/event/123/detailsview';
  expect(brightspaceEventIdentity(`Afficher l’événement - ${path}?ou=42#123`)).toBe(
    brightspaceEventIdentity(`View event - ${path}?language=en`),
  );
  expect(brightspaceEventIdentity('Lab 1 - Due')).toBeNull();
  expect(
    brightspaceEventIdentity(path.replace('school.brightspace.com', 'unrelated.example')),
  ).toBeNull();
  expect(brightspaceEventIdentity(`${path} ${path.replace('/123/', '/124/')}`)).toBeNull();
});
