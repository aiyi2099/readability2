import { ContentVariety, IContainerNode, INode, Result } from './types'
import { block } from './grouping'
import { badMultiplier, rejectCutoff, rejectMultiplier } from './tuning'

export class Node implements IContainerNode {
    parentNode: IContainerNode | null = null
    childNodes: INode[] = []
    readonly tagName: string

    chars!: number
    hyperchars!: number
    tags!: number
    score!: number
    sum!: number

    variety: number = ContentVariety.normal

    constructor(tagName: string) {
        this.tagName = tagName
    }

    appendChild<NT extends INode>(node: NT): NT {
        if (node.parentNode !== null)
            throw Error('appendChild: Attempted reparenting')
        node.parentNode = this
        this.childNodes.push(node)
        return node
    }

    lastChild(): INode | null {
        if (this.childNodes.length == 0)
            return null
        return this.childNodes[this.childNodes.length - 1]
    }

    compute(result: Result = { node: InfinityNode, sum: Infinity }): void {
        this.chars = this.hyperchars = this.sum = 0
        this.tags = 1

        this.childNodes.forEach(n => {
            n.compute(result)
            this.chars += n.chars
            this.hyperchars += n.hyperchars
            this.tags += n.tags
            this.sum += n.score
        })

        this.score = this.chars / this.tags * Math.log2((this.chars + 1) / (this.hyperchars + 1))

        if (this.ofVariety(ContentVariety.bad))
            this.score *= badMultiplier

        if (this.sum > result.sum)
            result.node = this, result.sum = this.sum
    }

    ofVariety(variety: ContentVariety.hyperlink | ContentVariety.bad): boolean {
        return (this.variety & variety) != 0
    }

    canReject(): boolean {
        return (this.score < rejectCutoff || this.tags > this.score * rejectMultiplier) &&
            this.lowersParentScore()
    }

    lowersParentScore(): boolean {
        if (this.parentNode === null)
            return false

        const parent = this.parentNode
        const score = parent.score
        const index = parent.childNodes.indexOf(this)

        parent.childNodes.splice(index, 1)
        parent.compute()
        parent.childNodes.splice(index, 0, this)

        const result = score < parent.score
        parent.score = score
        return result
    }

    containsText(): boolean {
        let chars = 0
        this.childNodes.forEach(n => {
            if (n instanceof Text)
                chars += n.chars
        })
        return chars > this.chars * 0.5
    }

    toString() {
        const parts = this.childNodes.map(n => n.toString())
        if (block.has(this.tagName)) {
            parts.unshift('\n\n')
            parts.push('\n\n')
        }
        return parts.join('')
    }
}

const InfinityNode = new Node('Infinity')