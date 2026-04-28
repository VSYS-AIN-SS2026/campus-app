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
    ...{ class: "dropdown" },
});
/** @type {__VLS_StyleScopedClasses['dropdown']} */ ;
if (__VLS_ctx.label) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
        for: (`select-${__VLS_ctx.label}`),
    });
    (__VLS_ctx.label);
}
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "select-wrapper" },
});
/** @type {__VLS_StyleScopedClasses['select-wrapper']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.select, __VLS_intrinsics.select)({
    ...{ onChange: (...[$event]) => {
            __VLS_ctx.$emit('update:modelValue', $event.target.value || null);
            // @ts-ignore
            [label, label, label, $emit,];
        } },
    id: (`select-${__VLS_ctx.label}`),
    value: (__VLS_ctx.modelValue),
    disabled: (__VLS_ctx.loading || (!__VLS_ctx.items.length && !__VLS_ctx.modelValue)),
});
__VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
    value: "",
});
(__VLS_ctx.placeholder ?? '— Auswählen —');
for (const [item] of __VLS_vFor((__VLS_ctx.items))) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
        key: (item.id),
        value: (item.id),
    });
    (item.label);
    // @ts-ignore
    [label, modelValue, modelValue, loading, items, items, placeholder,];
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
