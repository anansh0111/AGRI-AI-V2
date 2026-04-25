"""2D-CNN Spatial Feature Extractor (ResNet + SPP + SE)."""
import torch, torch.nn as nn, torch.nn.functional as F

class ResBlock2D(nn.Module):
    def __init__(self, ic, oc, s=1, d=0.0):
        super().__init__()
        self.c1 = nn.Sequential(nn.Conv2d(ic,oc,3,stride=s,padding=1,bias=False),nn.BatchNorm2d(oc),nn.ReLU(True))
        self.c2 = nn.Sequential(nn.Conv2d(oc,oc,3,padding=1,bias=False),nn.BatchNorm2d(oc))
        self.dr = nn.Dropout2d(d) if d>0 else nn.Identity()
        self.sc = nn.Sequential(nn.Conv2d(ic,oc,1,stride=s,bias=False),nn.BatchNorm2d(oc)) if s!=1 or ic!=oc else nn.Identity()
    def forward(self,x): return F.relu(self.c2(self.dr(self.c1(x)))+self.sc(x))

class SpatialCNN2D(nn.Module):
    def __init__(self, in_channels=3, feature_dim=128, dropout=0.1):
        super().__init__()
        self.stem = nn.Sequential(nn.Conv2d(in_channels,32,7,stride=2,padding=3,bias=False),nn.BatchNorm2d(32),nn.ReLU(True),nn.MaxPool2d(3,stride=2,padding=1))
        self.s1 = ResBlock2D(32,64)
        self.s2 = ResBlock2D(64,128,s=2,d=dropout)
        self.s3 = ResBlock2D(128,256,s=2,d=dropout)
        self.se = nn.Sequential(nn.AdaptiveAvgPool2d(1),nn.Flatten(),nn.Linear(256,16),nn.ReLU(),nn.Linear(16,256),nn.Sigmoid())
        self.proj = nn.Sequential(
            nn.Linear(256*(1+4+16),feature_dim*2),nn.LayerNorm(feature_dim*2),nn.GELU(),nn.Dropout(dropout),
            nn.Linear(feature_dim*2,feature_dim),nn.LayerNorm(feature_dim))
    def forward(self,x):
        x=self.stem(x); x=self.s1(x); x=self.s2(x); x=self.s3(x)
        x=x*self.se(x).view(-1,256,1,1)
        spp=torch.cat([F.adaptive_avg_pool2d(x,(l,l)).flatten(2) for l in [1,2,4]],dim=-1)
        return self.proj(spp.flatten(1))
