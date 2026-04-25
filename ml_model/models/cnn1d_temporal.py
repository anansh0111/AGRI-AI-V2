"""1D-CNN Temporal Feature Extractor."""
import torch, torch.nn as nn, torch.nn.functional as F

class ResBlock1D(nn.Module):
    def __init__(self, in_ch, out_ch, k=3, d=1, drop=0.1):
        super().__init__()
        p = d*(k-1)//2
        self.c1 = nn.Sequential(nn.Conv1d(in_ch,out_ch,k,padding=p,dilation=d,bias=False),nn.BatchNorm1d(out_ch),nn.ReLU(True),nn.Dropout(drop))
        self.c2 = nn.Sequential(nn.Conv1d(out_ch,out_ch,k,padding=p,dilation=d,bias=False),nn.BatchNorm1d(out_ch))
        self.sc = nn.Sequential(nn.Conv1d(in_ch,out_ch,1,bias=False),nn.BatchNorm1d(out_ch)) if in_ch!=out_ch else nn.Identity()
    def forward(self,x): return F.relu(self.c2(self.c1(x))+self.sc(x))

class TemporalCNN1D(nn.Module):
    def __init__(self, in_channels=20, feature_dim=128, window_size=64, dropout=0.1):
        super().__init__()
        self.s1 = nn.Sequential(nn.Conv1d(in_channels,32,7,padding=3,bias=False),nn.BatchNorm1d(32),nn.ReLU(True),ResBlock1D(32,32,drop=dropout))
        self.s2 = ResBlock1D(32,64,d=2,drop=dropout)
        self.s3 = ResBlock1D(64,128,d=4,drop=dropout)
        self.pg = nn.AdaptiveAvgPool1d(1)
        self.pl = nn.AdaptiveAvgPool1d(4)
        self.proj = nn.Sequential(
            nn.Linear(128+512,feature_dim*2),nn.LayerNorm(feature_dim*2),nn.GELU(),nn.Dropout(dropout),
            nn.Linear(feature_dim*2,feature_dim),nn.LayerNorm(feature_dim))
        for m in self.modules():
            if isinstance(m,nn.Conv1d): nn.init.kaiming_normal_(m.weight,nonlinearity='relu')
            elif isinstance(m,nn.Linear): nn.init.xavier_uniform_(m.weight); m.bias and nn.init.zeros_(m.bias)
    def forward(self,x):
        x=self.s1(x); x=self.s2(x); x=self.s3(x)
        return self.proj(torch.cat([self.pg(x).squeeze(-1),self.pl(x).flatten(1)],dim=-1))
