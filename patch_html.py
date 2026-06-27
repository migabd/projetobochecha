import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

start_marker = "        tailwind.config = {"
end_marker = "        /* Sepia background overrides */"

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx == -1 or end_idx == -1:
    print("Markers not found!")
    exit(1)

replacement = """        tailwind.config = {
            darkMode: 'class',
            theme: {
                extend: {
                    colors: {
                        primary: {
                            50: 'rgb(var(--primary-50) / <alpha-value>)',
                            100: 'rgb(var(--primary-100) / <alpha-value>)',
                            200: 'rgb(var(--primary-200) / <alpha-value>)',
                            300: 'rgb(var(--primary-300) / <alpha-value>)',
                            400: 'rgb(var(--primary-400) / <alpha-value>)',
                            500: 'rgb(var(--primary-500) / <alpha-value>)',
                            600: 'rgb(var(--primary-600) / <alpha-value>)',
                            700: 'rgb(var(--primary-700) / <alpha-value>)',
                            800: 'rgb(var(--primary-800) / <alpha-value>)',
                            900: 'rgb(var(--primary-900) / <alpha-value>)',
                            950: 'rgb(var(--primary-950) / <alpha-value>)',
                        },
                        zinc: {
                            50: 'rgb(var(--zinc-50) / <alpha-value>)',
                            100: 'rgb(var(--zinc-100) / <alpha-value>)',
                            200: 'rgb(var(--zinc-200) / <alpha-value>)',
                            300: 'rgb(var(--zinc-300) / <alpha-value>)',
                            400: 'rgb(var(--zinc-400) / <alpha-value>)',
                            500: 'rgb(var(--zinc-500) / <alpha-value>)',
                            600: 'rgb(var(--zinc-600) / <alpha-value>)',
                            700: 'rgb(var(--zinc-700) / <alpha-value>)',
                            800: 'rgb(var(--zinc-800) / <alpha-value>)',
                            900: 'rgb(var(--zinc-900) / <alpha-value>)',
                            950: 'rgb(var(--zinc-950) / <alpha-value>)',
                        }
                    }
                }
            }
        };
    </script>
    <style id="custom-styles">

        :root {
            /* Default values (Emerald) */
            --primary-50: 236 253 245;
            --primary-100: 209 250 229;
            --primary-200: 167 243 208;
            --primary-300: 110 231 183;
            --primary-400: 52 211 153;
            --primary-500: 16 185 129;
            --primary-600: 5 150 105;
            --primary-700: 4 120 87;
            --primary-800: 6 95 70;
            --primary-900: 6 78 59;
            --primary-950: 2 44 34;

            /* Default Light Zinc */
            --zinc-50: 250 250 250;
            --zinc-100: 244 244 245;
            --zinc-200: 228 228 231;
            --zinc-300: 212 212 216;
            --zinc-400: 161 161 170;
            --zinc-500: 113 113 122;
            --zinc-600: 82 82 91;
            --zinc-700: 63 63 70;
            --zinc-800: 39 39 42;
            --zinc-900: 24 24 27;
            --zinc-950: 9 9 11;
        }

        html[data-color-profile="emerald"] {
            --primary-50: 236 253 245;
            --primary-100: 209 250 229;
            --primary-200: 167 243 208;
            --primary-300: 110 231 183;
            --primary-400: 52 211 153;
            --primary-500: 16 185 129;
            --primary-600: 5 150 105;
            --primary-700: 4 120 87;
            --primary-800: 6 95 70;
            --primary-900: 6 78 59;
            --primary-950: 2 44 34;
        }

        html[data-color-profile="ocean"] {
            --primary-50: 239 246 255;
            --primary-100: 219 234 254;
            --primary-200: 191 219 254;
            --primary-300: 147 197 253;
            --primary-400: 96 165 250;
            --primary-500: 59 130 246;
            --primary-600: 37 99 235;
            --primary-700: 29 78 216;
            --primary-800: 30 64 175;
            --primary-900: 30 58 138;
            --primary-950: 23 37 84;
        }

        html[data-color-profile="amethyst"] {
            --primary-50: 250 245 255;
            --primary-100: 243 232 255;
            --primary-200: 233 213 255;
            --primary-300: 216 180 254;
            --primary-400: 192 132 252;
            --primary-500: 168 85 247;
            --primary-600: 147 51 234;
            --primary-700: 126 34 206;
            --primary-800: 107 33 168;
            --primary-900: 88 28 135;
            --primary-950: 59 7 100;
        }

        html[data-color-profile="crimson"] {
            --primary-50: 255 241 242;
            --primary-100: 255 228 230;
            --primary-200: 254 205 211;
            --primary-300: 253 164 175;
            --primary-400: 251 113 133;
            --primary-500: 244 63 94;
            --primary-600: 225 29 72;
            --primary-700: 190 18 60;
            --primary-800: 159 18 57;
            --primary-900: 136 19 55;
            --primary-950: 76 5 25;
        }

        html[data-color-profile="amber"] {
            --primary-50: 255 251 235;
            --primary-100: 254 243 199;
            --primary-200: 253 230 138;
            --primary-300: 252 211 77;
            --primary-400: 251 191 36;
            --primary-500: 245 158 11;
            --primary-600: 217 119 6;
            --primary-700: 180 83 9;
            --primary-800: 146 64 14;
            --primary-900: 120 53 15;
            --primary-950: 69 26 3;
        }

        html[data-color-profile="carbon"] {
            --primary-50: 250 250 250;
            --primary-100: 244 244 245;
            --primary-200: 228 228 231;
            --primary-300: 212 212 216;
            --primary-400: 161 161 170;
            --primary-500: 113 113 122;
            --primary-600: 82 82 91;
            --primary-700: 63 63 70;
            --primary-800: 39 39 42;
            --primary-900: 24 24 27;
            --primary-950: 9 9 11;
        }

        /* Sepia Mode Overrides */
        html.sepia {
            --zinc-50: 253 246 227;
            --zinc-100: 238 232 213;
            --zinc-200: 228 223 203;
            --zinc-300: 211 203 177;
            --zinc-400: 181 170 139;
            --zinc-500: 155 144 113;
            --zinc-600: 128 119 90;
            --zinc-700: 101 94 70;
            --zinc-800: 74 69 51;
            --zinc-900: 48 45 33;
            --zinc-950: 24 22 17;
        }

"""

new_content = content[:start_idx] + replacement + content[end_idx:]

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(new_content)
