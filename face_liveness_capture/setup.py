from setuptools import setup, find_packages
from pathlib import Path

HERE = Path(__file__).parent
README = (HERE / "README.md").read_text(encoding='utf-8') if (HERE / "README.md").exists() else ''

setup(
    name="face_liveness_capture",
    version="0.1.0",
    description="Client-side face liveness capture widget with Django integration",
    long_description=README,
    long_description_content_type='text/markdown',
    url='https://github.com/alok-kumar8765/face_liveness_capture',
    author='Alok Kumar Kaushal',
    author_email='alokkaushal42@gmail.com',
    license='MIT',
    packages=find_packages(),  # automatically finds backend, django_integration
    include_package_data=True, # ensures static/templates are included
    install_requires=[
        "Django>=4.2",
        "djangorestframework",
        "mediapipe",
        "numpy",
        "opencv-python"
    ],
    python_requires='>=3.8',
    classifiers=[
        'Development Status :: 4 - Beta',
        'Intended Audience :: Developers',
        'License :: OSI Approved :: MIT License',
        'Programming Language :: Python :: 3',
        'Programming Language :: Python :: 3.8',
        'Framework :: Django',
    ],
)
