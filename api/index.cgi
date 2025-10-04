#!/home/divsffoy/virtualenv/api/3.13/bin/python3

import sys
import os

# Set up the path
sys.path.insert(0, '/home/divsffoy/public_html/api')
os.chdir('/home/divsffoy/public_html/api')

# Import and run the Flask app via CGI
from wsgiref.handlers import CGIHandler
from app import app

CGIHandler().run(app)
