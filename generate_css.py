import re

def hex_to_rgb(hex_code):
    hex_code = hex_code.lstrip('#')
    return f"{int(hex_code[0:2], 16)} {int(hex_code[2:4], 16)} {int(hex_code[4:6], 16)}"

profiles = {
    'emerald': ['#ecfdf5', '#d1fae5', '#a7f3d0', '#6ee7b7', '#34d399', '#10b981', '#059669', '#047857', '#065f46', '#064e3b', '#022c22'],
    'ocean': ['#eff6ff', '#dbeafe', '#bfdbfe', '#93c5fd', '#60a5fa', '#3b82f6', '#2563eb', '#1d4ed8', '#1e40af', '#1e3a8a', '#172554'],
    'amethyst': ['#faf5ff', '#f3e8ff', '#e9d5ff', '#d8b4fe', '#c084fc', '#a855f7', '#9333ea', '#7e22ce', '#6b21a8', '#581c87', '#3b0764'],
    'crimson': ['#fff1f2', '#ffe4e6', '#fecdd3', '#fda4af', '#fb7185', '#f43f5e', '#e11d48', '#be123c', '#9f1239', '#881337', '#4c0519'],
    'amber': ['#fffbeb', '#fef3c7', '#fde68a', '#fcd34d', '#fbbf24', '#f59e0b', '#d97706', '#b45309', '#92400e', '#78350f', '#451a03'],
    'carbon': ['#fafafa', '#f4f4f5', '#e4e4e7', '#d4d4d8', '#a1a1aa', '#71717a', '#52525b', '#3f3f46', '#27272a', '#18181b', '#09090b']
}

zinc_light = ['#fafafa', '#f4f4f5', '#e4e4e7', '#d4d4d8', '#a1a1aa', '#71717a', '#52525b', '#3f3f46', '#27272a', '#18181b', '#09090b']
sepia_colors = ['#fdf6e3', '#eee8d5', '#e4dfcb', '#d3cbb1', '#b5aa8b', '#9b9071', '#80775a', '#655e46', '#4a4533', '#302d21', '#181611']

shades = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950']

def gen_vars(prefix, colors):
    res = []
    for s, c in zip(shades, colors):
        res.append(f"            --{prefix}-{s}: {hex_to_rgb(c)};")
    return "\n".join(res)

css = "        :root {\n"
css += "            /* Default values (Emerald) */\n"
css += gen_vars("primary", profiles['emerald']) + "\n\n"
css += "            /* Default Light Zinc */\n"
css += gen_vars("zinc", zinc_light) + "\n"
css += "        }\n\n"

for p, colors in profiles.items():
    css += f"        html[data-color-profile=\"{p}\"] {{\n"
    css += gen_vars("primary", colors) + "\n"
    css += "        }\n\n"

css += "        /* Sepia Mode Overrides */\n"
css += "        html.sepia {\n"
css += gen_vars("zinc", sepia_colors) + "\n"
css += "        }\n"

tailwind_config = "        tailwind.config = {\n            darkMode: 'class',\n            theme: {\n                extend: {\n                    colors: {\n"
tailwind_config += "                        primary: {\n"
for s in shades:
    tailwind_config += f"                            {s}: 'rgb(var(--primary-{s}) / <alpha-value>)',\n"
tailwind_config += "                        },\n                        zinc: {\n"
for s in shades:
    tailwind_config += f"                            {s}: 'rgb(var(--zinc-{s}) / <alpha-value>)',\n"
tailwind_config += "                        }\n                    }\n                }\n            }\n        };"

print(tailwind_config)
print("<style id=\"custom-styles\">")
print(css)
