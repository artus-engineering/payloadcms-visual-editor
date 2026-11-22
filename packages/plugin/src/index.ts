import type { Config, Plugin } from 'payload'

import {
  createFieldsEndpoint,
  createPluginState,
  createRelationFallbacksEndpoint,
  type VisualEditorPluginState,
} from './endpoints/visualEditorEndpoints.js'
import { type PayloadVisualEditorConfig, type VisualEditorCollectionConfig } from './types.js'

export const VISUAL_EDITOR_ADMIN_PATH =
  '@artus-engineering/payload-visual-editor/client#VisualEditorControls'

export type {
  EditableFieldType,
  PayloadVisualEditorConfig,
  VisualEditorCollectionConfig,
  VisualEditorGlobalConfig,
} from './types.js'

export { DEFAULT_EDITABLE_FIELD_TYPES } from './types.js'

function isEnabled(
  config: VisualEditorCollectionConfig | undefined,
): config is VisualEditorCollectionConfig {
  return config !== undefined
}

function registerAdminControl(
  components: NonNullable<NonNullable<Config['collections']>[number]['admin']>['components'],
): void {
  if (!components) {
    return
  }

  const editComponents = components.edit ?? {}
  components.edit = editComponents

  const existing = editComponents.beforeDocumentControls ?? []

  if (
    !existing.some(
      (component) =>
        (typeof component === 'string' && component === VISUAL_EDITOR_ADMIN_PATH) ||
        (typeof component === 'object' &&
          component !== null &&
          'path' in component &&
          component.path === VISUAL_EDITOR_ADMIN_PATH),
    )
  ) {
    editComponents.beforeDocumentControls = [...existing, VISUAL_EDITOR_ADMIN_PATH]
  }
}

function enableVisualEditorOnEntity(
  entity: NonNullable<Config['collections']>[number] | NonNullable<Config['globals']>[number],
): void {
  entity.admin = entity.admin ?? {}
  entity.admin.components = entity.admin.components ?? {}
  registerAdminControl(entity.admin.components)
}

export const payloadVisualEditor =
  (pluginOptions: PayloadVisualEditorConfig): Plugin =>
  (incomingConfig: Config): Config => {
    if (pluginOptions.disabled) {
      return incomingConfig
    }

    const pluginState: VisualEditorPluginState = createPluginState(pluginOptions)

    const config: Config = {
      ...incomingConfig,
      collections: [...(incomingConfig.collections ?? [])],
      endpoints: [...(incomingConfig.endpoints ?? [])],
      globals: [...(incomingConfig.globals ?? [])],
    }

    for (const collection of config.collections ?? []) {
      if (isEnabled(pluginState.collections.get(collection.slug))) {
        enableVisualEditorOnEntity(collection)
      }
    }

    for (const global of config.globals ?? []) {
      if (isEnabled(pluginState.globals.get(global.slug))) {
        enableVisualEditorOnEntity(global)
      }
    }

    const endpoints = config.endpoints ?? []
    endpoints.push(createFieldsEndpoint(pluginState), createRelationFallbacksEndpoint(pluginState))
    config.endpoints = endpoints

    return config
  }
