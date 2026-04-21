const __VLS_props = defineProps();
const __VLS_emit = defineEmits();
const __VLS_ctx = {
    ...{},
    ...{},
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "spo-selector" },
});
/** @type {__VLS_StyleScopedClasses['spo-selector']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
    for: "spo-select",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "select-wrapper" },
});
/** @type {__VLS_StyleScopedClasses['select-wrapper']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.select, __VLS_intrinsics.select)({
    ...{ onChange: (...[$event]) => {
            __VLS_ctx.$emit('update:modelValue', Number($event.target.value) || null);
            // @ts-ignore
            [$emit,];
        } },
    id: "spo-select",
    value: (__VLS_ctx.modelValue),
    disabled: (__VLS_ctx.loading),
});
__VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
    value: (0),
});
for (const [spo] of __VLS_vFor((__VLS_ctx.spos))) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
        key: (spo.id),
        value: (spo.id),
    });
    (spo.name);
    // @ts-ignore
    [modelValue, loading, spos,];
}
if (__VLS_ctx.loading) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.span)({
        ...{ class: "select-spinner" },
    });
    /** @type {__VLS_StyleScopedClasses['select-spinner']} */ ;
}
// @ts-ignore
[loading,];
const __VLS_export = (await import('vue')).defineComponent({
    __typeEmits: {},
    __typeProps: {},
});
export default {};
