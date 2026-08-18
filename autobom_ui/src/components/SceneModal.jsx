import { useFormik } from "formik"
import { useSelector } from "react-redux"
import { useTranslation } from "react-i18next"
import { Button, Group, Stack, TextInput } from "@mantine/core"
import { hideModal, showModal } from "../lib/modals.js"
import { resolveSceneName, selectScene, updateSceneName } from "../lib/scenes.js"
import AppModal from "./AppModal.jsx"


function SceneModal({ sceneId, onClose = hideModal }) {
  const { t } = useTranslation()
  const scene = useSelector(() => selectScene(sceneId))

  const formik = useFormik({
    enableReinitialize: true,
    validateOnBlur: false,
    initialValues: { name: resolveSceneName(scene) },
    validate: (values) => {
      const errors = {}
      if (!(values.name || "").trim()) errors.name = t("name_is_required")
      return errors
    },
    onSubmit: async (values, helpers) => {
      try {
        helpers.setSubmitting(true)
        await updateSceneName(sceneId, values.name.trim())
        hideModal()
      } catch (error) {
        console.error(error)
        helpers.setSubmitting(false)
      }
    }
  })

  const { values, errors, touched, isSubmitting } = formik
  const busy = isSubmitting

  return (
    <AppModal
      name={t("edit_scene")}
      onClose={onClose}
      className="max-w-[28rem]"
      footer={
        <Group justify="flex-end" gap="xs">
          <Button variant="default" disabled={busy} onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button
            color="brand"
            disabled={busy}
            loading={isSubmitting}
            onClick={formik.handleSubmit}
          >
            {t("save")}
          </Button>
        </Group>
      }
    >
      <form onSubmit={formik.handleSubmit}>
        <Stack gap="sm">
          <TextInput
            label={t("name")}
            name="name"
            data-autofocus
            disabled={busy}
            value={values.name}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={touched.name && errors.name}
          />
        </Stack>
      </form>
    </AppModal>
  )
}

export const showSceneModal = (props = {}) => showModal(SceneModal, props)

export default SceneModal
