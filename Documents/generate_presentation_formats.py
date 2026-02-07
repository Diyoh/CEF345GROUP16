
import sys
import subprocess
import os
import re

def install(package):
    subprocess.check_call([sys.executable, "-m", "pip", "install", package])

def check_and_install_dependencies():
    required_packages = ['python-docx', 'python-pptx', 'markdown', 'xhtml2pdf']
    for package in required_packages:
        try:
            __import__(package.replace('-', '_') if 'python' not in package else package.replace('python-', ''))
        except ImportError:
            print(f"Installing {package}...")
            install(package)

def read_markdown(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        return f.read()

def create_word(md_content, output_path):
    try:
        from docx import Document
        from docx.shared import Pt
        
        doc = Document()
        
        for line in md_content.split('\n'):
            line = line.strip()
            if not line:
                continue
            
            if line.startswith('# '):
                doc.add_heading(line[2:], level=0)
            elif line.startswith('## '):
                doc.add_heading(line[3:], level=1)
            elif line.startswith('### '):
                doc.add_heading(line[4:], level=2)
            elif line.startswith('- '):
                doc.add_paragraph(line[2:], style='List Bullet')
            else:
                doc.add_paragraph(line)
        
        doc.save(output_path)
        print(f"Created Word document: {output_path}")
    except Exception as e:
        print(f"Failed to create Word document: {e}")

def create_ppt(md_content, output_path):
    try:
        from pptx import Presentation
        from pptx.util import Inches, Pt
        
        prs = Presentation()
        title_slide_layout = prs.slide_layouts[0]
        bullet_slide_layout = prs.slide_layouts[1]
        
        current_slide = None
        
        lines = md_content.split('\n')
        
        # Create Title Slide
        slide = prs.slides.add_slide(title_slide_layout)
        title = slide.shapes.title
        subtitle = slide.placeholders[1]
        
        title.text = "Final Project Presentation"
        subtitle.text = "CEF345 Group 16"
        
        for line in lines:
            line = line.strip()
            if not line or line == '---' or line.startswith('# '):
                continue
            
            if line.startswith('## '):
                # New Slide
                current_slide = prs.slides.add_slide(bullet_slide_layout)
                shapes = current_slide.shapes
                title_shape = shapes.title
                body_shape = shapes.placeholders[1]
                title_shape.text = line[3:]
                tf = body_shape.text_frame
            elif line.startswith('### ') and current_slide:
                p = tf.add_paragraph()
                p.text = line[4:]
                p.font.bold = True
                p.level = 0
            elif line.startswith('- ') and current_slide:
                p = tf.add_paragraph()
                p.text = line[2:]
                p.level = 1
            elif current_slide:
                pass
                # Check if text_frame is initialized
                if 'tf' in locals():
                    p = tf.add_paragraph()
                    p.text = line
                    p.level = 0

        prs.save(output_path)
        print(f"Created PowerPoint presentation: {output_path}")
    except Exception as e:
        print(f"Failed to create PowerPoint presentation: {e}")

def create_pdf(md_content, output_path):
    try:
        from xhtml2pdf import pisa
        import markdown
        
        html_text = markdown.markdown(md_content)
        
        # Add basic styling
        html_content = f"""
        <html>
        <head>
        <style>
            body {{ font-family: Helvetica, sans-serif; font-size: 12pt; }}
            h1 {{ font-size: 24pt; color: #333366; }}
            h2 {{ font-size: 18pt; color: #333366; }}
            h3 {{ font-size: 14pt; color: #666666; }}
        </style>
        </head>
        <body>
        {html_text}
        </body>
        </html>
        """
        
        with open(output_path, "wb") as result_file:
            pisa_status = pisa.CreatePDF(html_content, dest=result_file)
            
        if pisa_status.err:
            print(f"Failed to create PDF")
        else:
            print(f"Created PDF document: {output_path}")
            
    except Exception as e:
        print(f"Failed to create PDF document: {e}")

if __name__ == "__main__":
    print("Checking dependencies...")
    check_and_install_dependencies()
    
    base_dir = os.path.dirname(os.path.abspath(__file__))
    md_file = os.path.join(base_dir, "Final_Project_Presentation.md")
    
    if not os.path.exists(md_file):
        print(f"Error: {md_file} not found.")
        sys.exit(1)
        
    print(f"Reading {md_file}...")
    content = read_markdown(md_file)
    
    create_word(content, os.path.join(base_dir, "Final_Project_Presentation.docx"))
    create_ppt(content, os.path.join(base_dir, "Final_Project_Presentation.pptx"))
    create_pdf(content, os.path.join(base_dir, "Final_Project_Presentation.pdf"))
    
    print("All formats generated successfully.")
