import type { ReactNode } from 'react';
import clsx from 'clsx';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

type FeatureItem = {
    title: string;
    image?: string;
    Svg?: React.ComponentType<React.ComponentProps<'svg'>>;
    description: ReactNode;
};

const FeatureList: FeatureItem[] = [
    {
        title: 'Vector Search Made Simple',
        image: require('@site/static/img/vector-search.webp').default,
        description: (
            <>
                High-level abstractions for vector similarity search. Schema-driven index
                management, automatic key generation, and built-in vectorizer integrations
                (HuggingFace, OpenAI, Cohere).
            </>
        ),
    },
    {
        title: 'AI-Native Extensions',
        Svg: require('@site/static/img/icon-semantic-caching-64-duotone.svg').default,
        description: (
            <>
                Semantic caching for LLMs, conversation memory management, and semantic routing.
                Purpose-built utilities for RAG pipelines and AI agents.
            </>
        ),
    },
    {
        title: 'Production-Ready',
        image: require('@site/static/img/json-type.webp').default,
        description: (
            <>
                Type-safe APIs with full TypeScript support. Schema validation, error handling, and
                batch operations. Works with HASH and JSON storage types.
            </>
        ),
    },
];

function Feature({ title, Svg, image, description }: FeatureItem) {
    return (
        <div className={clsx('col col--4')}>
            <div className="text--center">
                {Svg && <Svg className={styles.featureSvg} role="img" />}
                {image && <img src={image} className={styles.featureImg} alt={title} />}
            </div>
            <div className="text--center padding-horiz--md">
                <Heading as="h3">{title}</Heading>
                <p>{description}</p>
            </div>
        </div>
    );
}

export default function HomepageFeatures(): ReactNode {
    return (
        <section className={styles.features}>
            <div className="container">
                <div className="row">
                    {FeatureList.map((props, idx) => (
                        <Feature key={idx} {...props} />
                    ))}
                </div>
            </div>
        </section>
    );
}
