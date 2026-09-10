#!/bin/bash
CSS_FILES=("css/focus-tracker.css" "css/focus-tracker-badge.css")

for file in "${CSS_FILES[@]}"; do
    # Find the line number where the effects block starts
    line_num=$(grep -n "/\* تأثيرات الرتب التدريجية (Platinum to Machine) \*/" "$file" | cut -d: -f1)
    
    if [ ! -z "$line_num" ]; then
        # Delete from that line to the end of the file
        sed -i "${line_num},\$d" "$file"
    fi
done

NEW_FX=$(cat << 'CSSBLOCK'
/* تأثيرات الرتب التدريجية (Platinum to Machine) - لمعان وألوان بدون حركة */

/* 1. Platinum (هالة خفيفة جداً وثبات) */
.fx-platinum svg {
    filter: drop-shadow(0 0 4px rgba(229, 228, 226, 0.4));
    animation: glow-plat 4s ease-in-out infinite;
}
@keyframes glow-plat {
    0%, 100% { filter: drop-shadow(0 0 4px rgba(229, 228, 226, 0.4)) brightness(1); }
    50% { filter: drop-shadow(0 0 10px rgba(229, 228, 226, 0.7)) brightness(1.05); }
}

/* 2. Diamond (هالة أقوى ولمعان أزرق) */
.fx-diamond svg {
    filter: drop-shadow(0 0 8px rgba(0, 229, 255, 0.6));
    animation: glow-diamond 3.5s ease-in-out infinite;
}
@keyframes glow-diamond {
    0%, 100% { filter: drop-shadow(0 0 8px rgba(0, 229, 255, 0.6)) brightness(1); }
    50% { filter: drop-shadow(0 0 16px rgba(0, 229, 255, 0.9)) brightness(1.1); }
}

/* 3. Elite (وهج ساطع جداً) */
.fx-elite svg {
    filter: drop-shadow(0 0 12px rgba(0, 191, 255, 0.8));
    animation: glow-elite 3s ease-in-out infinite;
}
@keyframes glow-elite {
    0%, 100% { filter: drop-shadow(0 0 12px rgba(0, 191, 255, 0.8)) brightness(1); }
    50% { filter: drop-shadow(0 0 24px rgba(0, 191, 255, 1)) drop-shadow(0 0 8px rgba(255, 255, 255, 0.3)) brightness(1.15); }
}

/* 4. Champion (وهج ناري عالي) */
.fx-champion svg {
    filter: drop-shadow(0 0 15px rgba(255, 107, 0, 0.9));
    animation: glow-champion 2.5s ease-in-out infinite;
}
@keyframes glow-champion {
    0%, 100% { filter: drop-shadow(0 0 12px rgba(255, 107, 0, 0.7)) brightness(1); }
    50% { filter: drop-shadow(0 0 28px rgba(255, 107, 0, 1)) drop-shadow(0 0 10px rgba(255, 255, 0, 0.4)) brightness(1.2); }
}

/* 5. Unreal (توهج أسطوري ذهبي وناري) */
.fx-unreal svg {
    filter: drop-shadow(0 0 20px rgba(255, 215, 0, 1)) drop-shadow(0 0 10px rgba(255, 69, 0, 0.8));
    animation: glow-unreal 2s ease-in-out infinite;
}
@keyframes glow-unreal {
    0%, 100% { filter: drop-shadow(0 0 20px rgba(255, 215, 0, 1)) drop-shadow(0 0 10px rgba(255, 69, 0, 0.8)) brightness(1); }
    50% { filter: drop-shadow(0 0 35px rgba(255, 215, 0, 1)) drop-shadow(0 0 20px rgba(255, 69, 0, 1)) drop-shadow(0 0 10px rgba(255, 255, 255, 0.5)) brightness(1.25); }
}

/* 6. Machine (تأثير كهرومغناطيسي أخضر) */
.fx-machine svg {
    filter: drop-shadow(0 0 15px #00FF41);
    animation: glow-machine 1.5s infinite alternate;
}
@keyframes glow-machine {
    0%, 100% { filter: drop-shadow(0 0 15px #00FF41) brightness(1); }
    33% { filter: drop-shadow(0 0 25px #00FF41) drop-shadow(0 0 5px #00FF41) brightness(1.2); }
    66% { filter: drop-shadow(0 0 20px #00FF41) drop-shadow(0 0 10px #ffffff) brightness(1.3); }
}

/* 0. Bronze, Silver, Gold (تأثيرات بسيطة) */
.fx-bronze svg, .fx-silver svg, .fx-gold svg {
    filter: drop-shadow(0 0 2px rgba(255, 255, 255, 0.1));
    animation: glow-base 5s ease-in-out infinite;
}
@keyframes glow-base {
    0%, 100% { filter: drop-shadow(0 0 2px rgba(255, 255, 255, 0.1)) brightness(1); }
    50% { filter: drop-shadow(0 0 6px rgba(255, 255, 255, 0.3)) brightness(1.05); }
}
CSSBLOCK
)

for file in "${CSS_FILES[@]}"; do
    echo "$NEW_FX" >> "$file"
done
