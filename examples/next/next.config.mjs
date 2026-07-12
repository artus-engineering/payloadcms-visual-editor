import { withPayload } from '@payloadcms/next/withPayload'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dirname = path.dirname(fileURLToPath(import.meta.url))

const aliases = {
  '@payload-config': './payload.config.ts',
  '@artus-engineering/payload-visual-editor/client': '../../packages/plugin/src/exports/client.ts',
  '@artus-engineering/payload-visual-editor-client/react': '../../packages/client/src/react/index.tsx',
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    resolveAlias: aliases,
  },
  webpack: (webpackConfig) => {
    webpackConfig.resolve.alias = {
      ...webpackConfig.resolve.alias,
      '@payload-config': path.resolve(dirname, 'payload.config.ts'),
      '@artus-engineering/payload-visual-editor/client': path.resolve(
        dirname,
        '../../packages/plugin/src/exports/client.ts',
      ),
      '@artus-engineering/payload-visual-editor-client/react': path.resolve(
        dirname,
        '../../packages/client/src/react/index.tsx',
      ),
    }

    webpackConfig.resolve.extensionAlias = {
      '.cjs': ['.cts', '.cjs'],
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    }

    return webpackConfig
  },
  serverExternalPackages: ['mongodb-memory-server'],
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
