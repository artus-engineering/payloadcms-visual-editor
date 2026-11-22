import type { Endpoint, PayloadRequest } from 'payload'

import {
  collectEditableFields,
  collectRelationFallbacks,
  filterEditableFields,
} from '../lib/collectEditableFields.js'
import {
  DEFAULT_EDITABLE_FIELD_TYPES,
  type EditableFieldType,
  type PayloadVisualEditorConfig,
  type VisualEditorCollectionConfig,
} from '../types.js'

export type VisualEditorPluginState = {
  collections: Map<string, VisualEditorCollectionConfig>
  editableFieldTypes: readonly EditableFieldType[]
  globals: Map<string, VisualEditorCollectionConfig>
}

function resolveCollectionConfig(
  pluginState: VisualEditorPluginState,
  slug: string,
): VisualEditorCollectionConfig | undefined {
  return pluginState.collections.get(slug) ?? pluginState.globals.get(slug)
}

function requireAuthenticatedUser(req: PayloadRequest): Response | null {
  if (!req.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return null
}

export function createFieldsEndpoint(pluginState: VisualEditorPluginState): Endpoint {
  return {
    handler: (req: PayloadRequest) => {
      const unauthorized = requireAuthenticatedUser(req)

      if (unauthorized) {
        return unauthorized
      }

      const collection = req.query?.collection

      if (typeof collection !== 'string') {
        return Response.json({ error: 'Collection slug is required' }, { status: 400 })
      }

      const collectionConfig = resolveCollectionConfig(pluginState, collection)

      if (!collectionConfig) {
        return Response.json(
          { error: 'Collection or global is not enabled for visual editing' },
          { status: 400 },
        )
      }

      const collectionSchema =
        req.payload.collections[collection as keyof typeof req.payload.collections]?.config ??
        req.payload.config.globals.find((global) => global.slug === collection)

      if (!collectionSchema) {
        return Response.json({ error: 'Collection or global not found' }, { status: 404 })
      }

      const fields = filterEditableFields(
        collectEditableFields(collectionSchema.fields, pluginState.editableFieldTypes),
        collectionConfig === true ? {} : collectionConfig,
      )

      return Response.json({
        collection,
        fields,
      })
    },
    method: 'get',
    path: '/visual-editor/fields',
  }
}

export function createRelationFallbacksEndpoint(pluginState: VisualEditorPluginState): Endpoint {
  return {
    handler: (req: PayloadRequest) => {
      const unauthorized = requireAuthenticatedUser(req)

      if (unauthorized) {
        return unauthorized
      }

      const collection = req.query?.collection

      if (typeof collection !== 'string') {
        return Response.json({ error: 'Collection slug is required' }, { status: 400 })
      }

      const collectionConfig = resolveCollectionConfig(pluginState, collection)

      if (!collectionConfig) {
        return Response.json(
          { error: 'Collection or global is not enabled for visual editing' },
          { status: 400 },
        )
      }

      return Response.json({
        collection,
        fallbacks: collectRelationFallbacks(collectionConfig),
      })
    },
    method: 'get',
    path: '/visual-editor/relation-fallbacks',
  }
}

export function createPluginState(
  pluginOptions: PayloadVisualEditorConfig,
): VisualEditorPluginState {
  return {
    collections: new Map(Object.entries(pluginOptions.collections ?? {})),
    editableFieldTypes: pluginOptions.editableFieldTypes ?? DEFAULT_EDITABLE_FIELD_TYPES,
    globals: new Map(Object.entries(pluginOptions.globals ?? {})),
  }
}
