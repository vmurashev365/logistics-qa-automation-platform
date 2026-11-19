/**
 * Parallel run rules.
 *
 * A scenario tagged @serial changes something every other scenario depends on (for example
 * it locks out logins from this machine for a few seconds). In a parallel run it starts only
 * when nothing else is running, and nothing else starts while it runs in this invocation.
 * Independent invocations and other runners do not share this scheduler.
 * Without --parallel this rule has no effect.
 */

import { setParallelCanAssign } from '@cucumber/cucumber';

interface TaggedPickle {
  tags: ReadonlyArray<{ name: string }>;
}

const isSerial = (pickle: TaggedPickle): boolean => pickle.tags.some((tag) => tag.name === '@serial');

setParallelCanAssign((pickleInQuestion, picklesInProgress) => {
  if (isSerial(pickleInQuestion)) {
    return picklesInProgress.length === 0;
  }
  return !picklesInProgress.some(isSerial);
});
