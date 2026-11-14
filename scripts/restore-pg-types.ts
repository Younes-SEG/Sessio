import { TypeOverrides, types as pgTypes, type CustomTypesConfig } from 'pg';

const TIMESTAMP_WITHOUT_TIME_ZONE = 1114;
const TIMESTAMP_WITH_TIME_ZONE = 1184;
const parseTimestampWithTimeZone = pgTypes.getTypeParser(TIMESTAMP_WITH_TIME_ZONE, 'text');

/** Prisma stores UTC wall-clock values in timestamp columns; scope that interpretation to restore clients. */
export function restoreUtcTypes(): CustomTypesConfig {
  const scoped = new TypeOverrides();
  scoped.setTypeParser(TIMESTAMP_WITHOUT_TIME_ZONE, 'text', (value) =>
    parseTimestampWithTimeZone(`${value}+00`),
  );
  return scoped;
}
