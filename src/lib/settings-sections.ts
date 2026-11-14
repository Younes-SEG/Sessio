/** Settings sections, in display order; each has its own page at /settings/<id>. */
export const settingsSectionIds = [
  'account',
  'profile',
  'appearance',
  'calendar',
  'terms',
  'email',
  'privacy',
] as const;
export type SettingsSectionId = (typeof settingsSectionIds)[number];
export const isSettingsSection = (id: string): id is SettingsSectionId =>
  (settingsSectionIds as readonly string[]).includes(id);
