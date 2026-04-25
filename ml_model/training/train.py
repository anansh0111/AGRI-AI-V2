"""
Training script for Precision Agriculture MTL model.
Usage: python training/train.py --epochs 50 --batch_size 8

Download free training data from:
- PlantVillage dataset: https://www.kaggle.com/datasets/emmarex/plantdisease
- Put images in: ml_model/data/train/<class_name>/image.jpg
"""
import os, sys, json, argparse, logging
from pathlib import Path
import numpy as np
import torch, torch.nn as nn
from torch.utils.data import Dataset, DataLoader
from torch.optim import AdamW
from torch.optim.lr_scheduler import CosineAnnealingLR
from PIL import Image
import torchvision.transforms as T

sys.path.append(str(Path(__file__).parent.parent))
from models.multitask_model import PrecisionAgricultureMTL
from preprocessing.ceemdan_processor import CEEMDANPreprocessor, SensorDataValidator

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

ANOMALY_MAP = {"Normal":0,"Water Stress":1,"Pest Infestation":2,"Nutrient Deficiency":3,"Flood / Waterlogging":4}

class AgricultureDataset(Dataset):
    def __init__(self, data_dir, split="train", sensor_ch=20, win=64, img_size=224):
        self.data_dir = Path(data_dir)/split
        self.samples  = sorted([d for d in self.data_dir.iterdir()
                                 if d.is_dir() and (d/"labels.json").exists()]) \
                        if self.data_dir.exists() else []
        logger.info(f"{split}: {len(self.samples)} samples")
        self.prep = CEEMDANPreprocessor(n_imfs=4, window_size=win)
        self.val  = SensorDataValidator()
        self.sch  = sensor_ch; self.win = win
        augs = [T.RandomHorizontalFlip(),T.ColorJitter(0.3,0.3,0.2)] if split=="train" else []
        self.tf  = T.Compose([T.Resize((img_size,img_size)),*augs,T.ToTensor(),
                               T.Normalize([0.485,0.456,0.406],[0.229,0.224,0.225])])

    def __len__(self): return max(len(self.samples),1)

    def __getitem__(self, idx):
        if not self.samples:
            return torch.zeros(self.sch,self.win),torch.zeros(3,224,224),torch.tensor(500.0),torch.tensor(0),torch.tensor(4.0)
        d = self.samples[idx]
        with open(d/"sensor.json") as f: raw=json.load(f)
        clean = self.val.validate_and_clean(raw)
        try:    st = self.prep.process(clean).squeeze(0)
        except: st = torch.zeros(self.sch, self.win)
        ip = d/"image.jpg"
        img = Image.open(ip).convert("RGB") if ip.exists() else Image.fromarray(np.zeros((224,224,3),dtype=np.uint8))
        it  = self.tf(img)
        with open(d/"labels.json") as f: lb=json.load(f)
        carbon  = float(lb.get("carbon_emission_kg_ha",0))
        anomaly = ANOMALY_MAP.get(lb.get("anomaly_class","Normal"),0)
        yd      = float(lb.get("yield_tonnes_ha", 4.5))
        return st, it, torch.tensor(carbon,dtype=torch.float32), torch.tensor(anomaly,dtype=torch.long), torch.tensor(yd,dtype=torch.float32)

def main():
    p = argparse.ArgumentParser()
    p.add_argument("--data_dir",   default="data/")
    p.add_argument("--output_dir", default="checkpoints/")
    p.add_argument("--epochs",     type=int,   default=50)
    p.add_argument("--batch_size", type=int,   default=8)
    p.add_argument("--lr",         type=float, default=1e-3)
    p.add_argument("--feature_dim",type=int,   default=128)
    p.add_argument("--sensor_ch",  type=int,   default=20)
    p.add_argument("--win",        type=int,   default=64)
    args = p.parse_args()

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    logger.info(f"Device: {device}")

    tds = AgricultureDataset(args.data_dir,"train",args.sensor_ch,args.win)
    vds = AgricultureDataset(args.data_dir,"val",  args.sensor_ch,args.win)
    tdl = DataLoader(tds, batch_size=args.batch_size, shuffle=True,  num_workers=0)
    vdl = DataLoader(vds, batch_size=args.batch_size, shuffle=False, num_workers=0)

    model = PrecisionAgricultureMTL(args.sensor_ch,feature_dim=args.feature_dim,window_size=args.win).to(device)
    logger.info(f"Parameters: {sum(p.numel() for p in model.parameters()):,}")

    opt = AdamW(model.parameters(), lr=args.lr, weight_decay=1e-4)
    sch = CosineAnnealingLR(opt, T_max=args.epochs, eta_min=1e-6)
    out = Path(args.output_dir); out.mkdir(parents=True, exist_ok=True)
    best = float("inf")

    for epoch in range(1, args.epochs+1):
        model.train()
        tloss = 0
        for sensor, image, carbon, anomaly, yield_t in tdl:
            sensor,image = sensor.to(device),image.to(device)
            carbon,anomaly,yield_t = carbon.to(device),anomaly.to(device),yield_t.to(device)
            opt.zero_grad()
            outputs = model(sensor, image)
            losses  = model.compute_loss(outputs, carbon, anomaly, yield_t)
            losses["total"].backward()
            nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            opt.step()
            tloss += losses["total"].item()
        sch.step()

        model.eval()
        vloss, correct, n = 0, 0, 0
        with torch.no_grad():
            for sensor, image, carbon, anomaly, yield_t in vdl:
                sensor,image=sensor.to(device),image.to(device)
                carbon,anomaly,yield_t=carbon.to(device),anomaly.to(device),yield_t.to(device)
                out_ = model(sensor, image)
                los  = model.compute_loss(out_, carbon, anomaly, yield_t)
                vloss += los["total"].item()
                correct += (out_["anomaly_logits"].argmax(-1)==anomaly).sum().item()
                n += len(anomaly)

        vl = vloss/max(len(vdl),1)
        logger.info(f"Epoch {epoch:3d}/{args.epochs} | Train: {tloss/max(len(tdl),1):.4f} | Val: {vl:.4f} | Acc: {correct/max(n,1):.3f}")

        if vl < best:
            best = vl
            torch.save({"epoch":epoch,"model_state":model.state_dict(),"args":vars(args)}, out/"best_model.pt")
            logger.info(f"  Saved best model (val_loss={best:.4f})")

    logger.info(f"Training complete. Best model at: {out/'best_model.pt'}")

if __name__ == "__main__": main()
