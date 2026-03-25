import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
    title: 'RedisVL',
    tagline: 'The AI-native Redis TypeScript client',
    favicon: 'img/favicon.svg',

    // Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
    future: {
        v4: true, // Improve compatibility with the upcoming Docusaurus v4
    },

    // Set the production url of your site here
    url: 'https://redis-developer.github.io',
    // Set the /<baseUrl>/ pathname under which your site is served
    // For GitHub pages deployment, it is often '/<projectName>/'
    baseUrl: '/redis-vl-typescript/',

    // GitHub pages deployment config.
    // If you aren't using GitHub pages, you don't need these.
    organizationName: 'redis-developer', // Usually your GitHub org/user name.
    projectName: 'redis-vl-typescript', // Usually your repo name.

    onBrokenLinks: 'throw',

    // Even if you don't use internationalization, you can use this field to set
    // useful metadata like html lang. For example, if your site is Chinese, you
    // may want to replace "en" with "zh-Hans".
    i18n: {
        defaultLocale: 'en',
        locales: ['en'],
    },

    presets: [
        [
            'classic',
            {
                docs: {
                    sidebarPath: './sidebars.ts',
                    editUrl:
                        'https://github.com/redis-developer/redis-vl-typescript/tree/main/website/',
                },
                blog: false, // Disable blog for now
                theme: {
                    customCss: './src/css/custom.css',
                },
            } satisfies Preset.Options,
        ],
    ],

    plugins: [
        [
            'docusaurus-plugin-typedoc',
            {
                entryPoints: [
                    '../src/schema/index.ts',
                    '../src/indexes/search-index.ts',
                    '../src/vectorizers/index.ts',
                ],
                entryPointStrategy: 'expand',
                tsconfig: '../tsconfig.typedoc.json',
                out: 'docs/api',
                skipErrorChecking: true,
                exclude: ['../examples/**/*', '../node_modules/**/*'],
                readme: 'none',
                categorizeByGroup: true,
                groupOrder: ['Schema', 'Search Index', 'Vectorizers', '*'],
            },
        ],
    ],

    themeConfig: {
        image: 'img/logo.svg',
        colorMode: {
            respectPrefersColorScheme: true,
        },
        navbar: {
            title: 'RedisVL',
            logo: {
                alt: 'Redis Logo',
                src: 'img/logo.svg',
            },
            items: [
                {
                    type: 'docSidebar',
                    sidebarId: 'tutorialSidebar',
                    position: 'left',
                    label: 'Docs',
                },
                {
                    href: 'https://github.com/redis-developer/redis-vl-typescript',
                    label: 'GitHub',
                    position: 'right',
                },
            ],
        },
        footer: {
            style: 'dark',
            links: [
                {
                    title: 'Docs',
                    items: [
                        {
                            label: 'Getting Started',
                            to: '/docs/intro',
                        },
                    ],
                },
                {
                    title: 'Community',
                    items: [
                        {
                            label: 'Redis Discord',
                            href: 'https://discord.gg/redis',
                        },
                        {
                            label: 'Stack Overflow',
                            href: 'https://stackoverflow.com/questions/tagged/redis',
                        },
                    ],
                },
                {
                    title: 'More',
                    items: [
                        {
                            label: 'GitHub',
                            href: 'https://github.com/redis-developer/redis-vl-typescript',
                        },
                        {
                            label: 'Redis',
                            href: 'https://redis.io',
                        },
                    ],
                },
            ],
            copyright: `Copyright © ${new Date().getFullYear()} Redis Ltd.`,
        },
        prism: {
            theme: prismThemes.github,
            darkTheme: prismThemes.dracula,
        },
    } satisfies Preset.ThemeConfig,
};

export default config;
