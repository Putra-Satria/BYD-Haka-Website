import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import TopNav from "@/components/TopNav";

const ApplicationSuccess = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      
      <div className="container max-w-2xl mx-auto px-4 py-12">
        <Card className="border-2 border-primary/20">
          <CardContent className="pt-12 pb-8 text-center">
            <div className="flex justify-center mb-6">
              <CheckCircle2 className="w-20 h-20 text-primary animate-scale-in" />
            </div>
            
            <h1 className="text-3xl font-bold text-foreground mb-4">
              Application Submitted Successfully!
            </h1>
            
            <p className="text-muted-foreground text-lg mb-8 max-w-md mx-auto">
              Thank you for applying for a position at Haka Auto. Your application has been received and will be processed shortly.
            </p>
            
            <div className="bg-muted/50 rounded-lg p-6 mb-8 max-w-md mx-auto">
              <h3 className="font-semibold text-foreground mb-3">Next Steps:</h3>
              <ul className="text-sm text-muted-foreground space-y-2 text-left">
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>Our HR team will review your application</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>You will be contacted via email or phone if you pass the administrative selection</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>The selection process takes approximately 1-2 weeks</span>
                </li>
              </ul>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                onClick={() => navigate("/job-board")}
                className="min-w-[200px]"
              >
                Back to Job Board
              </Button>
              <Button 
                onClick={() => navigate("/")}
                variant="outline"
                className="min-w-[200px]"
              >
                Go to Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ApplicationSuccess;