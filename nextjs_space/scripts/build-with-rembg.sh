#!/bin/bash

echo "=========================================="
echo "  LERP Intranet - Build with rembg"
echo "=========================================="

# Cores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verificar Python
echo ""
echo "1️⃣  Checking Python..."
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version)
    echo -e "${GREEN}✅ $PYTHON_VERSION${NC}"
else
    echo -e "${RED}❌ Python3 not found${NC}"
    exit 1
fi

# Verificar pip
echo ""
echo "2️⃣  Checking pip..."
if command -v pip3 &> /dev/null; then
    PIP_VERSION=$(pip3 --version)
    echo -e "${GREEN}✅ $PIP_VERSION${NC}"
else
    echo -e "${RED}❌ pip3 not found${NC}"
    exit 1
fi

# Instalar rembg
echo ""
echo "3️⃣  Installing rembg..."
pip3 install --quiet rembg[cpu]==2.0.50 onnxruntime==1.16.0

if [ $? -eq 0 ]; then
    REMBG_VERSION=$(python3 -c "import rembg; print(rembg.__version__)" 2>/dev/null)
    echo -e "${GREEN}✅ rembg $REMBG_VERSION installed${NC}"
else
    echo -e "${RED}❌ Failed to install rembg${NC}"
    exit 1
fi

# Verificar instalação
echo ""
echo "4️⃣  Verifying installation..."
python3 << 'PYTHON'
try:
    import rembg
    import onnxruntime
    print("✅ rembg:", rembg.__version__)
    print("✅ onnxruntime:", onnxruntime.__version__)
    print("✅ All dependencies OK!")
except ImportError as e:
    print("❌ Import error:", e)
    exit(1)
PYTHON

# Prisma generate
echo ""
echo "5️⃣  Generating Prisma client..."
npx prisma generate
echo -e "${GREEN}✅ Prisma client generated${NC}"

# Build Next.js
echo ""
echo "6️⃣  Building Next.js..."
npm run build

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}=========================================="
    echo -e "  ✅ BUILD SUCCESSFUL!"
    echo -e "==========================================${NC}"
    echo ""
    echo "Background remover is ready with rembg (FREE)"
    echo ""
else
    echo ""
    echo -e "${RED}=========================================="
    echo -e "  ❌ BUILD FAILED"
    echo -e "==========================================${NC}"
    exit 1
fi
