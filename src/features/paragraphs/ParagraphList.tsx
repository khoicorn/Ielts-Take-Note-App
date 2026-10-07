import type { TaskType } from '@/lib/types'

/** Stub. The Model Paragraphs task replaces this file. */
export function ParagraphList(props: { taskType?: TaskType }) {
  return <div data-task-type={props.taskType ?? ''} />
}
