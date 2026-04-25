"""
Multi-Task Learning Model
Transformer fusion + Carbon Regression + Anomaly Classification
Loss: MSE + lambda * CrossEntropy
"""
import math, torch, torch.nn as nn, torch.nn.functional as F
from .cnn1d_temporal import TemporalCNN1D
from .cnn2d_spatial  import SpatialCNN2D

class CrossAttn(nn.Module):
    def __init__(self, d=128, h=4, drop=0.1):
        super().__init__()
        self.h=h; self.dh=d//h; self.sc=math.sqrt(d//h)
        self.q=nn.Linear(d,d); self.k=nn.Linear(d,d); self.v=nn.Linear(d,d)
        self.o=nn.Linear(d,d); self.dr=nn.Dropout(drop)
    def forward(self,q,k,v):
        B=q.size(0)
        if q.dim()==2: q=q.unsqueeze(1)
        if k.dim()==2: k=k.unsqueeze(1)
        if v.dim()==2: v=v.unsqueeze(1)
        def sp(x,l): return l(x).view(B,-1,self.h,self.dh).transpose(1,2)
        Q,K,V=sp(q,self.q),sp(k,self.k),sp(v,self.v)
        a=self.dr(F.softmax(Q@K.transpose(-2,-1)/self.sc,-1))
        o=(a@V).transpose(1,2).contiguous().view(B,-1,self.h*self.dh)
        return self.o(o).squeeze(1), a.mean(1)

class TransformerFusion(nn.Module):
    def __init__(self, d=128, h=4, drop=0.1):
        super().__init__()
        self.st=nn.Parameter(torch.randn(1,d)); self.it=nn.Parameter(torch.randn(1,d))
        self.cs=CrossAttn(d,h,drop); self.ci=CrossAttn(d,h,drop)
        enc=nn.TransformerEncoderLayer(d,h,d*4,drop,'gelu',batch_first=True,norm_first=True)
        self.sa=nn.TransformerEncoder(enc,2)
        self.ns=nn.LayerNorm(d); self.ni=nn.LayerNorm(d)
        self.proj=nn.Sequential(nn.Linear(d*2,d),nn.LayerNorm(d),nn.GELU())
    def forward(self,sf,im):
        B=sf.size(0)
        s=sf+self.st.expand(B,-1); i=im+self.it.expand(B,-1)
        su,attn=self.cs(s,i,i); s=self.ns(s+su)
        iu,_=self.ci(i,s,s);    i=self.ni(i+iu)
        j=self.sa(torch.stack([s,i],1))
        return self.proj(j.flatten(1)), attn

class CarbonHead(nn.Module):
    def __init__(self,d=128,drop=0.1):
        super().__init__()
        self.net=nn.Sequential(nn.Linear(d,64),nn.LayerNorm(64),nn.GELU(),nn.Dropout(drop),nn.Linear(64,1))
    def forward(self,x): return (torch.sigmoid(self.net(x))*10000).squeeze(-1)

class AnomalyHead(nn.Module):
    CLASSES=["Normal","Water Stress","Pest Infestation","Nutrient Deficiency","Flood / Waterlogging"]
    N=5
    def __init__(self,d=128,drop=0.1):
        super().__init__()
        self.net=nn.Sequential(nn.Linear(d,64),nn.LayerNorm(64),nn.GELU(),nn.Dropout(drop),nn.Linear(64,self.N))
    def forward(self,x): return self.net(x)

class YieldHead(nn.Module):
    """Additional head: predicts crop yield (tonnes/ha)."""
    def __init__(self,d=128,drop=0.1):
        super().__init__()
        self.net=nn.Sequential(nn.Linear(d,32),nn.GELU(),nn.Dropout(drop),nn.Linear(32,1))
    def forward(self,x): return (torch.sigmoid(self.net(x))*10).squeeze(-1)  # 0-10 t/ha

class PrecisionAgricultureMTL(nn.Module):
    def __init__(self,sensor_channels=20,img_channels=3,feature_dim=128,window_size=64,lambda_cls=1.0,dropout=0.1):
        super().__init__()
        self.lam  = lambda_cls
        self.tcnn = TemporalCNN1D(sensor_channels,feature_dim,window_size,dropout)
        self.scnn = SpatialCNN2D(img_channels,feature_dim,dropout)
        self.fuse = TransformerFusion(feature_dim,4,dropout)
        self.ch   = CarbonHead(feature_dim,dropout)
        self.ah   = AnomalyHead(feature_dim,dropout)
        self.yh   = YieldHead(feature_dim,dropout)

    def forward(self,sensor,image):
        s,i=self.tcnn(sensor),self.scnn(image)
        fused,attn=self.fuse(s,i)
        return {"carbon_emission":self.ch(fused),"anomaly_logits":self.ah(fused),
                "yield_pred":self.yh(fused),"attention_weights":attn}

    def compute_loss(self,out,carbon_tgt,anomaly_tgt,yield_tgt=None):
        mse=F.mse_loss(out["carbon_emission"],carbon_tgt)
        ce =F.cross_entropy(out["anomaly_logits"],anomaly_tgt)
        loss=mse+self.lam*ce
        if yield_tgt is not None:
            loss+=0.5*F.mse_loss(out["yield_pred"],yield_tgt)
        return {"total":loss,"mse":mse,"ce":ce}

    @torch.no_grad()
    def predict(self,sensor,image):
        self.eval()
        out=self.forward(sensor,image)
        probs=F.softmax(out["anomaly_logits"],dim=-1)
        cid=probs.argmax(dim=-1); conf=probs.max(dim=-1).values
        return {
            "carbon_emission_kg_ha":out["carbon_emission"].cpu().numpy().tolist(),
            "anomaly_class":[AnomalyHead.CLASSES[i] for i in cid.cpu().numpy()],
            "confidence_score":conf.cpu().numpy().tolist(),
            "yield_pred_tonnes_ha":out["yield_pred"].cpu().numpy().tolist(),
        }
