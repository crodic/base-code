import { unified } from 'unified';
import rehypeParse from 'rehype-dom-parse';
import rehypeStringify from 'rehype-stringify';
import { visit } from 'unist-util-visit';
import parameterize from 'parameterize';

interface useTOCProps {
    content: string;
    heading?: HTMLHeadingElement['tagName'];
}

export const useTOC = ({ content, heading = 'h2' }: useTOCProps) => {
    let toc: any[] = [];

    const html = unified()
        .use(rehypeParse, {
            fragment: true,
        })
        .use(() => {
            return (tree: any) => {
                visit(tree, 'element', function (node) {
                    // Tìm các thẻ heading
                    if (node.tagName === heading) {
                        const id = parameterize(node.children[0].value); // Tạo slug có thể dùng slugify thay thế
                        node.properties.id = id;
                        node.properties.class = node.properties.class;
                        //   ? `${node.properties.class} ${styles.header}`
                        //   : styles.header;

                        // Tạo mảng Table Of Contents
                        toc.push({
                            id,
                            title: node.children[0].value,
                        });

                        node.children.unshift({
                            type: 'element',
                            properties: {
                                href: `#${id}`,
                                // class: styles.anchor,
                                'aria-hidden': 'true',
                            },
                            tagName: 'a',
                        });
                    }
                });
                return;
            };
        })
        .use(rehypeStringify)
        .processSync(content)
        .toString();

    return {
        toc,
        html,
    };
};
