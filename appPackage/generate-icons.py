#!/usr/bin/env python3
"""
Générateur d'icônes Microsoft Teams pour Assistant GPT Teams
Conforme aux spécifications officielles Microsoft :
- Color icon: 192x192 pixels, symbole 120x120, padding 36px
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

def create_color_icon(output_path="color.png"):
    """
    Crée l'icône couleur 192x192 pixels
    Design : Symbole GPT stylisé avec gradient
    """
    size = 192
    symbol_size = 120
    padding = 36
    
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
    
    # Dessiner symbole "GPT" stylisé - Bulle de conversation avec étoile IA
    # Bulle de conversation principale
    bubble_margin = 50
    bubble_coords = [
        bubble_margin, bubble_margin + 10,
        size - bubble_margin, size - bubble_margin - 10
    ]
    draw.ellipse(bubble_coords, fill=(255, 255, 255, 255))
    
    # Queue de la bulle (triangle)
    queue_points = [
        (bubble_margin + 15, size - bubble_margin - 10),
        (bubble_margin + 5, size - bubble_margin + 5),
        (bubble_margin + 25, size - bubble_margin - 5)
    ]
    draw.polygon(queue_points, fill=(255, 255, 255, 255))
    
    # Étoile IA au centre (symbolise l'intelligence artificielle)
    star_center_x = center
    star_center_y = center - 5
    star_size = 35
    
    # Dessiner étoile à 4 branches (sparkle IA)
    for angle in [0, 45, 90, 135, 180, 225, 270, 315]:
        import math
        rad = math.radians(angle)
        # Branches longues
        if angle % 90 == 0:
            length = star_size
        else:
            length = star_size * 0.4
        
        end_x = star_center_x + length * math.cos(rad)
        end_y = star_center_y + length * math.sin(rad)
        
        draw.line(
            [(star_center_x, star_center_y), (end_x, end_y)],
            fill=hex_to_rgb(ACCENT_COLOR),
            width=6
        )
    
    # Point central de l'étoile
    draw.ellipse(
        [star_center_x - 8, star_center_y - 8,
         star_center_x + 8, star_center_y + 8],
        fill=hex_to_rgb(ACCENT_COLOR)
    )
    
    # Texte "GPT" en petit sous l'étoile
    try:
        # Essayer avec une police système
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 20)
    except:
        font = ImageFont.load_default()
    
    text = "GPT"
    # Calculer position centrée du texte
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_x = center - text_width // 2
    text_y = center + 25
    
    draw.text((text_x, text_y), text, fill=hex_to_rgb(PRIMARY_COLOR), font=font)
    
    # Sauvegarder
    img.save(output_path, 'PNG')
    print(f"✅ Color icon créée: {output_path} (192x192 pixels)")
    return output_path

def create_outline_icon(output_path="outline.png"):
    """
    Crée l'icône outline 32x32 pixels
    Design : Symbole simplifié blanc pur sur fond transparent
    IMPORTANT : Blanc pur RGB(255, 255, 255) uniquement
    """
    size = 32
    
    # Créer image avec fond transparent
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    center = size // 2
    
    # Bulle de conversation simplifiée (blanc pur)
    bubble_margin = 4
    bubble_coords = [
        bubble_margin, bubble_margin + 2,
        size - bubble_margin, size - bubble_margin - 2
    ]
    draw.ellipse(bubble_coords, fill=(255, 255, 255, 255))
    
    # Queue de la bulle (blanc pur)
    queue_points = [
        (bubble_margin + 3, size - bubble_margin - 2),
        (bubble_margin + 1, size - bubble_margin + 2),
        (bubble_margin + 5, size - bubble_margin - 1)
    ]
    draw.polygon(queue_points, fill=(255, 255, 255, 255))
    
    # Étoile IA simplifiée au centre (blanc pur)
    star_center_x = center
    star_center_y = center - 1
    star_size = 8
    
    import math
    for angle in [0, 90, 180, 270]:  # 4 branches principales seulement
        rad = math.radians(angle)
        end_x = star_center_x + star_size * math.cos(rad)
        end_y = star_center_y + star_size * math.sin(rad)
        
        draw.line(
            [(star_center_x, star_center_y), (end_x, end_y)],
            fill=(255, 255, 255, 255),
            width=2
        )
    
    # Point central blanc
    draw.ellipse(
        [star_center_x - 2, star_center_y - 2,
         star_center_x + 2, star_center_y + 2],
        fill=(255, 255, 255, 255)
    )
    
    # Sauvegarder
    img.save(output_path, 'PNG')
    print(f"✅ Outline icon créée: {output_path} (32x32 pixels, blanc pur)")
    return output_path

def backup_existing_icons():
    """Sauvegarder les icônes existantes"""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    
    for icon in ['color.png', 'outline.png']:
        icon_path = os.path.join(script_dir, icon)
        if os.path.exists(icon_path):
            backup_path = os.path.join(script_dir, f"{icon}.backup")
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
    print("  - Color: 192x192 px, symbole 120x120 px, padding 36 px")
    print("  - Outline: 32x32 px, blanc pur RGB(255,255,255), transparent")
    print()
    
    color_path = create_color_icon("color.png")
    outline_path = create_outline_icon("outline.png")
    
    print("\n" + "=" * 70)
    print("✅ Icônes générées avec succès!")
    print(f"📁 Répertoire: {script_dir}")
    print("\n⚠️  IMPORTANT:")
    print("  1. Vérifier visuellement les icônes générées")
    print("  2. Tester dans Teams (apparence dans différents contextes)")
    print("  3. Si nécessaire, ajuster les couleurs/design dans ce script")
    print("  4. Regénérer le package: cd .. && npm run build")
    print("\n💡 Pour restaurer les anciennes icônes:")
    print("  mv color.png.backup color.png && mv outline.png.backup outline.png")

if __name__ == "__main__":
    main()
