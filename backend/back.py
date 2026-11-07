from fastapi import FastAPI

app = FastAPI(
    title="S.W.A.C.H Navsari API",
    description="Smart Waste Action and Cleanliness Hub",
    version="1.0.0"
)

@app.get("/")
def home():
    return {
        "message": "Welcome to S.W.A.C.H Navsari!",
        "status": "Backend is running successfully"
    }

@app.get("/health")
def health():
    return {"status": "healthy"}