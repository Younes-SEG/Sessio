import 'dotenv/config';
import { mkdirSync, writeFileSync } from 'node:fs';
import { db } from '../src/lib/server/db';
import { retireCalendarTasks } from '../src/lib/server/calendar-reconcile';

// Explicit maintenance command, never a startup seed or an automatic database reset.
const url = new URL(process.env.DATABASE_URL ?? '');
if (!['localhost', '127.0.0.1'].includes(url.hostname))
  throw new Error('This repair is for the local database only.');
try {
  const result = await db.$transaction(
    async (tx) => {
      const assessments = await tx.assessment.findMany({
        where: { course: { semester: { workspaceId: 'local' } } },
      });
      const tasks = await tx.task.findMany({
        where: { workspaceId: 'local' },
        include: { subtasks: true },
      });
      const imports = await tx.importedCalendarItem.findMany({
        where: { subscription: { workspaceId: 'local' } },
      });
      mkdirSync('.postgres/backups', { recursive: true });
      writeFileSync(
        `.postgres/backups/calendar-${Date.now()}.json`,
        JSON.stringify({ assessments, tasks, imports }, null, 2),
      );
      const cleanup = await retireCalendarTasks(tx, 'local');
      const linked = await tx.assessment.findMany({
        where: { course: { semester: { workspaceId: 'local' } }, calendarImport: { some: {} } },
      });

      // Existing scores, scales, weights and progress must survive unchanged.
      for (const row of assessments.filter(
        (a) => a.score !== null || a.status !== 'NOT_STARTED' || a.weight !== 0,
      )) {
        const saved = await tx.assessment.findUnique({ where: { id: row.id } });
        if (
          !saved ||
          saved.score !== row.score ||
          saved.maxScore !== row.maxScore ||
          saved.weight !== row.weight ||
          saved.status !== row.status
        )
          throw new Error('A progressed assessment changed unexpectedly; repair rolled back.');
      }
      return {
        ...cleanup,
        linkedAssessments: linked.length,
        linkedTasks: await tx.task.count({
          where: { workspaceId: 'local', calendarManaged: true },
        }),
      };
    },
    { isolationLevel: 'Serializable', timeout: 30000 },
  );
  console.log(JSON.stringify(result));
} finally {
  await db.$disconnect();
}
