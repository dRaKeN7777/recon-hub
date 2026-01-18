import warnings

try:
    from Wappalyzer import Wappalyzer, WebPage
except ImportError:
    Wappalyzer = None

def wappalyzer_scan(target: str):
    if not Wappalyzer:
         return {"error": "Wappalyzer library not installed"}
    
    try:
        # Ensure URL has scheme
        url = target
        if not url.startswith("http"):
            url = "https://" + url
        
        # Suppress warnings
        warnings.simplefilter('ignore')
        
        # Note: In a production env, instantiate Wappalyzer once globally or lazily
        wappalyzer = Wappalyzer.latest()
        webpage = WebPage.new_from_url(url)
        technologies = wappalyzer.analyze_with_versions_and_categories(webpage)
        
        return {"technologies": technologies}
    except Exception as e:
        return {"error": f"Wappalyzer failed: {str(e)}"}
