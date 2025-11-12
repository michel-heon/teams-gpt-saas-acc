#!/usr/bin/env python3
"""
Générateur d'icônes Microsoft Teams pour Assistant GPT Teams
Conforme aux spécifications officielles Microsoft Teams 2024 :
- Color icon: 192x192 pixels (requis depuis 2024)
- Outline icon: 32x32 pixels, blanc pur RGB(255,255,255), fond transparent
"""

from PIL import Image, ImageDraw, ImageFont
import os

# Couleurs Cotechnoe (basées sur le branding)
PRIMARY_COLOR = "#0078D4"  # Bleu Microsoft
ACCENT_COLOR = "#50E6FF"   # Bleu clair accent
BACKGROUND_COLOR = "#FFFFFF"  # Fond blanc

def hex_to_rgb(hex_color):
    """Convertir couleur hex en RGB"""
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))

def create_color_icon(output_path="../appPackage/color.png"):
    """
    Crée l'icône couleur 192x192 pixels
    Design : Symbole GPT stylisé avec gradient
    Conforme spécifications Microsoft Teams 2024
    """
    size = 192
    symbol_size = 120  # Proportionnel (192 * 0.625)
    padding = 36  # Proportionnel (192 * 0.1875)
    
    # Créer image avec fond transparent
    img = Image.new('RGBA', (size, size), (255, 255, 255, 0))
    draw = ImageDraw.Draw(img)
    
    # Centrer le symbole (avec padding de 36px)
    center = size // 2
    symbol_radius = symbol_size // 2
    
    # Fond carré avec couleur (respecte le padding)
    background_rect = [padding, padding, size - padding, size - padding]
    draw.rounded_rectangle(
        background_rect,
        radius=20,
        fill=hex_to_rgb(PRIMARY_COLOR)
    )
    
    # Dessiner symbole moderne "GPT-4.1" avec design IA épuré
    import math
    
    # Cercle principal blanc (plus grand et centré)
    circle_radius = 85
    circle_coords = [
        center - circle_radius, center - circle_radius,
        center + circle_radius, center + circle_radius
    ]
    draw.ellipse(circle_coords, fill=(255, 255, 255, 255))
    
    # Anneau dégradé autour (effet moderne)
    ring_width = 6
    for i in range(ring_width):
        ring_coords = [
            center - circle_radius - i, center - circle_radius - i,
            center + circle_radius + i, center + circle_radius + i
        ]
        # Dégradé de bleu clair vers transparent
        alpha = int(100 - (i * 15))
        draw.ellipse(ring_coords, outline=hex_to_rgb(ACCENT_COLOR) + (alpha,), width=1)
    
    # Étoile IA stylisée au centre supérieur
    star_center_x = center
    star_center_y = center - 25
    star_size = 30
    
    # Dessiner étoile à 8 branches (plus détaillée)
    for angle in range(0, 360, 45):
        rad = math.radians(angle)
        # Alterner branches longues et courtes
        if angle % 90 == 0:
            length = star_size
            width = 4
        else:
            length = star_size * 0.5
            width = 3
        
        end_x = star_center_x + length * math.cos(rad)
        end_y = star_center_y + length * math.sin(rad)
        
        draw.line(
            [(star_center_x, star_center_y), (end_x, end_y)],
            fill=hex_to_rgb(ACCENT_COLOR),
            width=width
        )
    
    # Point central de l'étoile (plus grand)
    center_size = 10
    draw.ellipse(
        [star_center_x - center_size, star_center_y - center_size,
         star_center_x + center_size, star_center_y + center_size],
        fill=hex_to_rgb(ACCENT_COLOR)
    )
    
    # Texte "GPT-4.1" moderne et visible
    try:
        # Police grande et bold pour visibilité
        font_large = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 38)
    except:
        font_large = ImageFont.load_default()
    
    text = "GPT-4.1"
    # Calculer position centrée du texte
    bbox = draw.textbbox((0, 0), text, font=font_large)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    text_x = center - text_width // 2
    text_y = center + 15  # Sous l'étoile
    
    draw.text((text_x, text_y), text, fill=hex_to_rgb(PRIMARY_COLOR), font=font_large)
    
    # Sauvegarder
    img.save(output_path, 'PNG')
    print(f"✅ Color icon créée: {output_path} (256x256 pixels)")
    return output_path

def create_outline_icon(output_path="../appPackage/outline.png"):
    """
    Crée l'icône outline 32x32 pixels
    Design : Symbole moderne "GPT-4.1" blanc pur sur fond transparent
    IMPORTANT : Blanc pur RGB(255, 255, 255) uniquement
    """
    size = 32
    import math
    
    # Créer image avec fond transparent
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    center = size // 2
    
    # Cercle principal blanc pur
    circle_radius = 13
    circle_coords = [
        center - circle_radius, center - circle_radius,
        center + circle_radius, center + circle_radius
    ]
    draw.ellipse(circle_coords, fill=(255, 255, 255, 255))
    
    # Étoile IA simplifiée (8 branches fines)
    star_center_x = center
    star_center_y = center - 4
    star_size = 5
    
    for angle in range(0, 360, 45):
        rad = math.radians(angle)
        if angle % 90 == 0:
            length = star_size
        else:
            length = star_size * 0.6
        
        end_x = star_center_x + length * math.cos(rad)
        end_y = star_center_y + length * math.sin(rad)
        
        draw.line(
            [(star_center_x, star_center_y), (end_x, end_y)],
            fill=(255, 255, 255, 255),
            width=1
        )
    
    # Point central blanc
    draw.ellipse(
        [star_center_x - 2, star_center_y - 2,
         star_center_x + 2, star_center_y + 2],
        fill=(255, 255, 255, 255)
    )
    
    # Texte "4.1" minimaliste (très petit)
    try:
        font_tiny = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 7)
    except:
        font_tiny = ImageFont.load_default()
    
    text = "4.1"
    bbox = draw.textbbox((0, 0), text, font=font_tiny)
    text_width = bbox[2] - bbox[0]
    text_x = center - text_width // 2
    text_y = center + 3
    
    draw.text((text_x, text_y), text, fill=(255, 255, 255, 255), font=font_tiny)
    
    # Sauvegarder
    img.save(output_path, 'PNG')
    print(f"✅ Outline icon créée: {output_path} (32x32 pixels, blanc pur)")
    return output_path

def backup_existing_icons():
    """Sauvegarder les icônes existantes"""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    appPackage_dir = os.path.join(script_dir, '..', 'appPackage')
    
    for icon in ['color.png', 'outline.png']:
        icon_path = os.path.join(appPackage_dir, icon)
        if os.path.exists(icon_path):
            backup_path = os.path.join(appPackage_dir, f"{icon}.backup")
            os.rename(icon_path, backup_path)
            print(f"📦 Backup: {icon} → {icon}.backup")

def main():
    """Générer les icônes conformes Microsoft Teams"""
    print("🎨 Génération des icônes Microsoft Teams pour Assistant GPT Teams")
    print("=" * 70)
    
    # Se placer dans le répertoire du script
    script_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(script_dir)
    
    # Backup des icônes existantes
    backup_existing_icons()
    
    # Générer nouvelles icônes
    print("\n📐 Spécifications Microsoft Teams:")
    print("  - Color: 256x256 px (recommandé 216-350px), symbole 160x160 px, padding 48 px")
    print("  - Outline: 32x32 px, blanc pur RGB(255,255,255), transparent")
    print()
    
    color_path = create_color_icon()
    outline_path = create_outline_icon()
    
    print("\n" + "=" * 70)
    print("✅ Icônes générées avec succès!")
    appPackage_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'appPackage')
    print(f"📁 Répertoire: {appPackage_dir}")
    print("\n⚠️  IMPORTANT:")
    print("  1. Vérifier visuellement les icônes générées")
    print("  2. Tester dans Teams (apparence dans différents contextes)")
    print("  3. Si nécessaire, ajuster les couleurs/design dans ce script")
    print("  4. Regénérer le package: cd .. && npm run build")
    print("\n💡 Pour restaurer les anciennes icônes:")
    print("  mv color.png.backup color.png && mv outline.png.backup outline.png")

if __name__ == "__main__":
    main()
