import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkRehype from 'remark-rehype'

const md = `- [ ] Task 1\n- [x] Task 2`
const file = await unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype)
  .run(unified().use(remarkParse).parse(md))

console.log(JSON.stringify(file, null, 2))
