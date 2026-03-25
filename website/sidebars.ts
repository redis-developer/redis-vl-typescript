import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

/**
 * Creating a sidebar enables you to:
 - create an ordered group of docs
 - render a sidebar for each doc of that group
 - provide next/previous navigation

 The sidebars can be generated from the filesystem, or explicitly defined here.

 Create as many sidebars as you want.
 */
const sidebars: SidebarsConfig = {
    tutorialSidebar: [
        'intro',
        {
            type: 'category',
            label: 'User Guide',
            items: ['user-guide/schema', 'user-guide/search-index', 'user-guide/vectorizers'],
        },
        {
            type: 'category',
            label: 'API Reference',
            collapsed: true,
            items: [
                {
                    type: 'category',
                    label: 'Schema',
                    link: { type: 'doc', id: 'api/schema/index' },
                    items: [
                        {
                            type: 'category',
                            label: 'Classes',
                            items: [
                                {
                                    type: 'doc',
                                    id: 'api/schema/classes/IndexSchema',
                                    label: 'IndexSchema',
                                },
                                {
                                    type: 'doc',
                                    id: 'api/schema/classes/TextField',
                                    label: 'TextField',
                                },
                                {
                                    type: 'doc',
                                    id: 'api/schema/classes/TagField',
                                    label: 'TagField',
                                },
                                {
                                    type: 'doc',
                                    id: 'api/schema/classes/NumericField',
                                    label: 'NumericField',
                                },
                                {
                                    type: 'doc',
                                    id: 'api/schema/classes/GeoField',
                                    label: 'GeoField',
                                },
                                {
                                    type: 'doc',
                                    id: 'api/schema/classes/FlatVectorField',
                                    label: 'FlatVectorField',
                                },
                                {
                                    type: 'doc',
                                    id: 'api/schema/classes/HNSWVectorField',
                                    label: 'HNSWVectorField',
                                },
                                {
                                    type: 'doc',
                                    id: 'api/schema/classes/BaseField',
                                    label: 'BaseField',
                                },
                                {
                                    type: 'doc',
                                    id: 'api/schema/classes/FieldFactory',
                                    label: 'FieldFactory',
                                },
                                {
                                    type: 'doc',
                                    id: 'api/schema/classes/IndexInfo',
                                    label: 'IndexInfo',
                                },
                            ],
                        },
                        {
                            type: 'category',
                            label: 'Enumerations',
                            items: [
                                {
                                    type: 'doc',
                                    id: 'api/schema/enumerations/FieldType',
                                    label: 'FieldType',
                                },
                                {
                                    type: 'doc',
                                    id: 'api/schema/enumerations/StorageType',
                                    label: 'StorageType',
                                },
                                {
                                    type: 'doc',
                                    id: 'api/schema/enumerations/VectorDistanceMetric',
                                    label: 'VectorDistanceMetric',
                                },
                                {
                                    type: 'doc',
                                    id: 'api/schema/enumerations/VectorIndexAlgorithm',
                                    label: 'VectorIndexAlgorithm',
                                },
                                {
                                    type: 'doc',
                                    id: 'api/schema/enumerations/VectorDataType',
                                    label: 'VectorDataType',
                                },
                                {
                                    type: 'doc',
                                    id: 'api/schema/enumerations/CompressionType',
                                    label: 'CompressionType',
                                },
                            ],
                        },
                        {
                            type: 'category',
                            label: 'Interfaces',
                            items: [
                                {
                                    type: 'doc',
                                    id: 'api/schema/interfaces/FieldInput',
                                    label: 'FieldInput',
                                },
                                {
                                    type: 'doc',
                                    id: 'api/schema/interfaces/TextFieldAttrs',
                                    label: 'TextFieldAttrs',
                                },
                                {
                                    type: 'doc',
                                    id: 'api/schema/interfaces/TagFieldAttrs',
                                    label: 'TagFieldAttrs',
                                },
                                {
                                    type: 'doc',
                                    id: 'api/schema/interfaces/NumericFieldAttrs',
                                    label: 'NumericFieldAttrs',
                                },
                                {
                                    type: 'doc',
                                    id: 'api/schema/interfaces/GeoFieldAttrs',
                                    label: 'GeoFieldAttrs',
                                },
                                {
                                    type: 'doc',
                                    id: 'api/schema/interfaces/VectorFieldAttrs',
                                    label: 'VectorFieldAttrs',
                                },
                                {
                                    type: 'doc',
                                    id: 'api/schema/interfaces/FlatVectorFieldAttrs',
                                    label: 'FlatVectorFieldAttrs',
                                },
                                {
                                    type: 'doc',
                                    id: 'api/schema/interfaces/HNSWVectorFieldAttrs',
                                    label: 'HNSWVectorFieldAttrs',
                                },
                                {
                                    type: 'doc',
                                    id: 'api/schema/interfaces/BaseFieldAttrs',
                                    label: 'BaseFieldAttrs',
                                },
                            ],
                        },
                    ],
                },
                {
                    type: 'category',
                    label: 'Indexes',
                    link: { type: 'doc', id: 'api/indexes/search-index/index' },
                    items: [
                        {
                            type: 'category',
                            label: 'Classes',
                            items: [
                                {
                                    type: 'doc',
                                    id: 'api/indexes/search-index/classes/SearchIndex',
                                    label: 'SearchIndex',
                                },
                            ],
                        },
                        {
                            type: 'category',
                            label: 'Interfaces',
                            items: [
                                {
                                    type: 'doc',
                                    id: 'api/indexes/search-index/interfaces/CreateIndexOptions',
                                    label: 'CreateIndexOptions',
                                },
                                {
                                    type: 'doc',
                                    id: 'api/indexes/search-index/interfaces/DeleteIndexOptions',
                                    label: 'DeleteIndexOptions',
                                },
                                {
                                    type: 'doc',
                                    id: 'api/indexes/search-index/interfaces/LoadOptions',
                                    label: 'LoadOptions',
                                },
                            ],
                        },
                    ],
                },
                {
                    type: 'category',
                    label: 'Vectorizers',
                    link: { type: 'doc', id: 'api/vectorizers/index' },
                    items: [
                        {
                            type: 'category',
                            label: 'Classes',
                            items: [
                                {
                                    type: 'doc',
                                    id: 'api/vectorizers/classes/HuggingFaceVectorizer',
                                    label: 'HuggingFaceVectorizer',
                                },
                                {
                                    type: 'doc',
                                    id: 'api/vectorizers/classes/BaseVectorizer',
                                    label: 'BaseVectorizer',
                                },
                            ],
                        },
                        {
                            type: 'category',
                            label: 'Interfaces',
                            items: [
                                {
                                    type: 'doc',
                                    id: 'api/vectorizers/interfaces/HuggingFaceConfig',
                                    label: 'HuggingFaceConfig',
                                },
                            ],
                        },
                    ],
                },
            ],
        },
    ],
};

export default sidebars;
