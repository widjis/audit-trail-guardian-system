import { Card } from "@/components/ui/card";

interface TemplateProps {
  name: string;
  position: string;
  message: string;
  photo?: string;
}

// Template 1: Modern Gradient
export const ModernTemplate = ({ name, position, message, photo }: TemplateProps) => {
  return (
    <Card className="bg-gradient-to-br from-white to-blue-50 border-0 shadow-lg max-w-2xl mx-auto overflow-hidden">
      <div className="relative p-8">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500 to-blue-300 rounded-full transform translate-x-16 -translate-y-16 opacity-20"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-purple-500 to-purple-300 rounded-full transform -translate-x-12 translate-y-12 opacity-20"></div>
        
        <div className="relative z-10">
          {/* Company Logo */}
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center gap-3">
              <img
                src="/MTI-removebg-preview.png"
                alt="PT. Merdeka Tsingshan Indonesia"
                className="h-12 w-auto"
              />
              <div>
                <div className="text-sm font-semibold text-gray-700">PT. Merdeka Tsingshan Indonesia</div>
              </div>
            </div>
          </div>

          <div className="text-left mb-8">
            <span className="inline-block px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-400 text-white text-sm font-medium rounded-full mb-4">
              🎉 New Team Member
            </span>
            {photo && (
              <div className="w-28 h-28 mb-4">
                <img
                  src={photo}
                  alt={name}
                  className="w-full h-full object-cover rounded-full border-4 border-blue-200 shadow-lg"
                />
              </div>
            )}
            <h1 className="text-4xl font-bold text-gray-800 mb-2">Hey Team!</h1>
            <p className="text-xl text-gray-600">Please welcome <span className="font-semibold text-blue-600">{name}</span> as our new <span className="font-semibold text-blue-600">{position}</span></p>
          </div>
          
          <div className="bg-white/50 backdrop-blur-sm p-6 rounded-2xl border border-white/20 mb-6">
            <p className="text-gray-700 leading-relaxed text-lg">{message}</p>
          </div>
          
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <div className="flex-1 h-px bg-gradient-to-r from-blue-300/50 to-transparent"></div>
            <span>Welcome to the team!</span>
            <div className="flex-1 h-px bg-gradient-to-l from-blue-300/50 to-transparent"></div>
          </div>
        </div>
      </div>
    </Card>
  );
};

// Template 2: Corporate Professional
export const CorporateTemplate = ({ name, position, message, photo }: TemplateProps) => {
  return (
    <Card className="bg-white border border-gray-200 shadow-xl max-w-2xl mx-auto">
      <div className="p-8">
        {/* Company Logo */}
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <img
              src="/MTI-removebg-preview.png"
              alt="PT. Merdeka Tsingshan Indonesia"
              className="h-10 w-auto"
            />
            <div className="text-sm font-semibold text-gray-800">PT. Merdeka Tsingshan Indonesia</div>
          </div>
        </div>

        <div className="flex items-start gap-6 mb-6">
          {photo && (
            <div className="w-24 h-24 flex-shrink-0">
              <img
                src={photo}
                alt={name}
                className="w-full h-full object-cover rounded-lg border-2 border-gray-300"
              />
            </div>
          )}
          <div className="flex-1">
            <div className="bg-gray-900 text-white px-4 py-2 rounded-lg inline-block mb-3">
              <span className="text-sm font-medium">New Team Member</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{name}</h1>
            <p className="text-lg text-gray-600 font-medium">{position}</p>
          </div>
        </div>
        
        <div className="border-l-4 border-gray-900 pl-6 mb-6">
          <p className="text-gray-700 leading-relaxed">{message}</p>
        </div>
        
        <div className="text-center">
          <div className="inline-flex items-center gap-2 text-sm text-gray-500">
            <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
            <span>Please join us in welcoming our newest team member</span>
            <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
          </div>
        </div>
      </div>
    </Card>
  );
};

// Template 3: Creative Colorful
export const CreativeTemplate = ({ name, position, message, photo }: TemplateProps) => {
  return (
    <Card className="bg-gradient-to-br from-pink-100 via-purple-50 to-indigo-100 border-0 shadow-2xl max-w-2xl mx-auto overflow-hidden">
      <div className="relative p-8">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500"></div>
        
        {/* Company Logo */}
        <div className="flex justify-center mb-6 mt-4">
          <div className="flex items-center gap-3 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg">
            <img
              src="/MTI-removebg-preview.png"
              alt="PT. Merdeka Tsingshan Indonesia"
              className="h-8 w-auto"
            />
            <div className="text-xs font-semibold text-gray-700">PT. Merdeka Tsingshan Indonesia</div>
          </div>
        </div>

        <div className="text-center mb-8">
          <div className="inline-block p-3 bg-white rounded-full shadow-lg mb-4">
            <span className="text-2xl">🌟</span>
          </div>
          {photo && (
            <div className="w-32 h-32 mx-auto mb-4">
              <img
                src={photo}
                alt={name}
                className="w-full h-full object-cover rounded-full border-4 border-white shadow-xl"
              />
            </div>
          )}
          <h1 className="text-4xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Welcome {name}!
          </h1>
          <p className="text-xl text-gray-700">
            Our new <span className="font-semibold text-purple-600">{position}</span>
          </p>
        </div>
        
        <div className="bg-white/80 backdrop-blur-sm p-6 rounded-3xl shadow-lg mb-6">
          <p className="text-gray-700 leading-relaxed text-center">{message}</p>
        </div>
        
        <div className="text-center">
          <span className="inline-block px-6 py-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-full text-sm font-medium">
            Let's welcome our newest team member! ✨
          </span>
        </div>
      </div>
    </Card>
  );
};

// Template 4: Minimalist Clean
export const MinimalistTemplate = ({ name, position, message, photo }: TemplateProps) => {
  return (
    <Card className="bg-white border-0 shadow-sm max-w-2xl mx-auto">
      <div className="p-12">
        {/* Company Logo */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-3">
            <img
              src="/MTI-removebg-preview.png"
              alt="PT. Merdeka Tsingshan Indonesia"
              className="h-8 w-auto opacity-80"
            />
            <div className="text-xs font-light text-gray-600">PT. Merdeka Tsingshan Indonesia</div>
          </div>
        </div>

        <div className="text-center mb-8">
          <div className="inline-block px-4 py-2 bg-gray-100 rounded text-sm font-medium text-gray-700 mb-4">
            🎉 New Team Member
          </div>
          {photo && (
            <div className="w-20 h-20 mx-auto mb-6">
              <img
                src={photo}
                alt={name}
                className="w-full h-full object-cover rounded-full"
              />
            </div>
          )}
          <h1 className="text-3xl font-light text-gray-900 mb-2">Welcome {name}!</h1>
          <p className="text-lg text-gray-500 font-light">Please join us in welcoming our new {position}</p>
          <div className="w-12 h-px bg-gray-300 mx-auto mt-4"></div>
        </div>
        
        <div className="mb-8">
          <p className="text-gray-600 leading-relaxed text-center font-light">{message}</p>
        </div>
        
        <div className="text-center">
          <span className="text-sm text-gray-400 font-light">Welcome to the team</span>
        </div>
      </div>
    </Card>
  );
};

// Template 5: Tech Startup
export const TechTemplate = ({ name, position, message, photo }: TemplateProps) => {
  return (
    <Card className="bg-gray-900 text-white border-0 shadow-2xl max-w-2xl mx-auto overflow-hidden">
      <div className="relative p-8">
        <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-green-400 to-blue-500 rounded-full transform translate-x-20 -translate-y-20 opacity-20"></div>
        
        <div className="relative z-10">
          {/* Company Logo */}
          <div className="flex justify-center mb-6">
            <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-lg border border-white/20">
              <img
                src="/MTI-removebg-preview.png"
                alt="PT. Merdeka Tsingshan Indonesia"
                className="h-8 w-auto brightness-0 invert"
              />
              <div className="text-xs font-medium text-white">PT. Merdeka Tsingshan Indonesia</div>
            </div>
          </div>

          <div className="flex items-center gap-2 mb-6">
            <div className="w-3 h-3 bg-green-400 rounded-full"></div>
            <span className="text-green-400 text-sm font-mono">SYSTEM_ONLINE</span>
          </div>
          
          <div className="mb-8">
            {photo && (
              <div className="w-24 h-24 mb-4">
                <img
                  src={photo}
                  alt={name}
                  className="w-full h-full object-cover rounded-lg border-2 border-green-400"
                />
              </div>
            )}
            <h1 className="text-4xl font-bold mb-2">
              <span className="text-green-400">&gt;</span> Hello {name}
            </h1>
            <p className="text-xl text-gray-300">
              <span className="text-blue-400 font-mono">role:</span> {position}
            </p>
          </div>
          
          <div className="bg-gray-800 border border-gray-700 p-6 rounded-lg mb-6 font-mono text-sm">
            <div className="text-green-400 mb-2">// Welcome message</div>
            <p className="text-gray-300 leading-relaxed">{message}</p>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <span className="font-mono">$</span>
            <span>ready_to_code --team=awesome</span>
          </div>
        </div>
      </div>
    </Card>
  );
};

// Template 6: Elegant Formal
export const ElegantTemplate = ({ name, position, message, photo }: TemplateProps) => {
  return (
    <Card className="bg-gradient-to-b from-slate-50 to-white border border-slate-200 shadow-xl max-w-2xl mx-auto">
      <div className="p-10">
        {/* Company Logo */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-3 border-b border-slate-200 pb-2">
            <img
              src="/MTI-removebg-preview.png"
              alt="PT. Merdeka Tsingshan Indonesia"
              className="h-8 w-auto opacity-70"
            />
            <div className="text-xs font-light text-slate-600 tracking-wide">PT. Merdeka Tsingshan Indonesia</div>
          </div>
        </div>

        <div className="text-center mb-8">
          <div className="w-1 h-16 bg-slate-800 mx-auto mb-6"></div>
          {photo && (
            <div className="w-28 h-28 mx-auto mb-6">
              <img
                src={photo}
                alt={name}
                className="w-full h-full object-cover rounded-full border-4 border-slate-200"
              />
            </div>
          )}
          <h1 className="text-4xl font-serif text-slate-800 mb-3">{name}</h1>
          <p className="text-lg text-slate-600 font-light tracking-wide">{position}</p>
        </div>
        
        <div className="border-t border-b border-slate-200 py-6 mb-6">
          <p className="text-slate-700 leading-relaxed text-center italic">{message}</p>
        </div>
        
        <div className="text-center">
          <span className="text-sm text-slate-500 font-light tracking-widest uppercase">
            Distinguished Excellence
          </span>
        </div>
      </div>
    </Card>
  );
};

// Template 7: Playful Fun
export const PlayfulTemplate = ({ name, position, message, photo }: TemplateProps) => {
  return (
    <Card className="bg-gradient-to-br from-yellow-100 to-orange-100 border-0 shadow-lg max-w-2xl mx-auto overflow-hidden">
      <div className="relative p-8">
        <div className="absolute top-4 right-4 text-4xl">🎊</div>
        <div className="absolute bottom-4 left-4 text-3xl">🚀</div>
        
        {/* Company Logo */}
        <div className="flex justify-center mb-6">
          <div className="flex items-center gap-3 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg transform rotate-1">
            <img
              src="/MTI-removebg-preview.png"
              alt="PT. Merdeka Tsingshan Indonesia"
              className="h-8 w-auto"
            />
            <div className="text-xs font-semibold text-orange-700">PT. Merdeka Tsingshan Indonesia</div>
          </div>
        </div>

        <div className="text-center mb-8">
          <div className="inline-block p-4 bg-white rounded-full shadow-lg mb-4 transform rotate-12">
            <span className="text-3xl">👋</span>
          </div>
          {photo && (
            <div className="w-32 h-32 mx-auto mb-4">
              <img
                src={photo}
                alt={name}
                className="w-full h-full object-cover rounded-full border-4 border-orange-300 shadow-lg transform -rotate-3"
              />
            </div>
          )}
          <h1 className="text-4xl font-bold text-orange-600 mb-2 transform -rotate-1">
            Hey there, {name}!
          </h1>
          <p className="text-xl text-orange-700 font-semibold">
            Our new awesome {position}! 🌟
          </p>
        </div>
        
        <div className="bg-white p-6 rounded-2xl shadow-lg mb-6 transform rotate-1">
          <p className="text-gray-700 leading-relaxed text-center">{message}</p>
        </div>
        
        <div className="text-center">
          <span className="inline-block px-6 py-3 bg-orange-500 text-white rounded-full text-lg font-bold transform -rotate-1 shadow-lg">
            Let's have some fun! 🎉
          </span>
        </div>
      </div>
    </Card>
  );
};

// Template 8: Nature Inspired
export const NatureTemplate = ({ name, position, message, photo }: TemplateProps) => {
  return (
    <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 shadow-xl max-w-2xl mx-auto overflow-hidden">
      <div className="relative p-8">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-300 to-emerald-300 rounded-full transform translate-x-16 -translate-y-16 opacity-30"></div>
        
        <div className="relative z-10">
          {/* Company Logo */}
          <div className="flex justify-center mb-6">
            <div className="flex items-center gap-3 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-xl border border-green-200 shadow-sm">
              <img
                src="/MTI-removebg-preview.png"
                alt="PT. Merdeka Tsingshan Indonesia"
                className="h-8 w-auto"
              />
              <div className="text-xs font-medium text-green-800">PT. Merdeka Tsingshan Indonesia</div>
            </div>
          </div>

          <div className="text-center mb-8">
            <div className="inline-block p-3 bg-white rounded-full shadow-lg mb-4">
              <span className="text-2xl">🌱</span>
            </div>
            {photo && (
              <div className="w-28 h-28 mx-auto mb-4">
                <img
                  src={photo}
                  alt={name}
                  className="w-full h-full object-cover rounded-full border-4 border-green-300 shadow-lg"
                />
              </div>
            )}
            <h1 className="text-4xl font-bold text-green-800 mb-2">Welcome {name}</h1>
            <p className="text-xl text-green-700">Growing as our new <span className="font-semibold">{position}</span></p>
          </div>
          
          <div className="bg-white/70 backdrop-blur-sm p-6 rounded-2xl border border-green-200 mb-6">
            <p className="text-green-800 leading-relaxed text-center">{message}</p>
          </div>
          
          <div className="text-center">
            <span className="inline-block px-6 py-2 bg-green-600 text-white rounded-full text-sm font-medium">
              🌿 Ready to grow together? 🌿
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
};

// Template 9: Geometric Modern
export const GeometricTemplate = ({ name, position, message, photo }: TemplateProps) => {
  return (
    <Card className="bg-white border-0 shadow-2xl max-w-2xl mx-auto overflow-hidden">
      <div className="relative">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500"></div>
        
        <div className="p-8">
          {/* Company Logo */}
          <div className="flex justify-center mb-6">
            <div className="flex items-center gap-3 bg-gray-50 px-4 py-2 rounded-lg border border-gray-200">
              <img
                src="/MTI-removebg-preview.png"
                alt="PT. Merdeka Tsingshan Indonesia"
                className="h-8 w-auto"
              />
              <div className="text-xs font-medium text-gray-700">PT. Merdeka Tsingshan Indonesia</div>
            </div>
          </div>

          <div className="flex items-start gap-8 mb-8">
            <div className="flex-1">
              <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-purple-500 rounded-lg mb-4 flex items-center justify-center">
                <span className="text-white text-2xl font-bold">W</span>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{name}</h1>
              <p className="text-lg text-gray-600">{position}</p>
            </div>
            {photo && (
              <div className="w-24 h-24">
                <img
                  src={photo}
                  alt={name}
                  className="w-full h-full object-cover rounded-lg"
                />
              </div>
            )}
          </div>
          
          <div className="relative">
            <div className="absolute left-0 top-0 w-1 h-full bg-gradient-to-b from-cyan-500 to-purple-500"></div>
            <div className="pl-6">
              <p className="text-gray-700 leading-relaxed">{message}</p>
            </div>
          </div>
          
          <div className="mt-8 flex items-center gap-4">
            <div className="flex gap-2">
              <div className="w-3 h-3 bg-cyan-500 rounded-full"></div>
              <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
              <div className="w-3 h-3 bg-pink-500 rounded-full"></div>
            </div>
            <span className="text-sm text-gray-500">Innovation starts here</span>
          </div>
        </div>
      </div>
    </Card>
  );
};

// Template 10: Retro Vintage
export const RetroTemplate = ({ name, position, message, photo }: TemplateProps) => {
  return (
    <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 shadow-xl max-w-2xl mx-auto">
      <div className="p-8">
        {/* Company Logo */}
        <div className="flex justify-center mb-6">
          <div className="flex items-center gap-3 bg-amber-100 border-2 border-amber-300 px-4 py-2 rounded-lg">
            <img
              src="/MTI-removebg-preview.png"
              alt="PT. Merdeka Tsingshan Indonesia"
              className="h-8 w-auto sepia"
            />
            <div className="text-xs font-serif text-amber-800">PT. Merdeka Tsingshan Indonesia</div>
          </div>
        </div>

        <div className="text-center mb-8">
          <div className="inline-block p-4 bg-amber-100 rounded-full border-2 border-amber-300 mb-4">
            <span className="text-2xl">📻</span>
          </div>
          {photo && (
            <div className="w-28 h-28 mx-auto mb-4">
              <img
                src={photo}
                alt={name}
                className="w-full h-full object-cover rounded-full border-4 border-amber-300 sepia"
              />
            </div>
          )}
          <h1 className="text-4xl font-bold text-amber-800 mb-2 font-serif">
            Greetings {name}!
          </h1>
          <p className="text-xl text-amber-700 font-serif">
            Our distinguished new {position}
          </p>
        </div>
        
        <div className="bg-amber-100 border-2 border-amber-300 p-6 rounded-lg mb-6">
          <div className="text-center mb-2">
            <span className="text-sm text-amber-600 font-serif">~ Welcome Message ~</span>
          </div>
          <p className="text-amber-800 leading-relaxed text-center font-serif">{message}</p>
        </div>
        
        <div className="text-center">
          <span className="inline-block px-6 py-2 bg-amber-600 text-white rounded text-sm font-serif">
            Est. Excellence Since Day One
          </span>
        </div>
      </div>
    </Card>
  );
};

// Template 11: Space Theme
export const SpaceTemplate = ({ name, position, message, photo }: TemplateProps) => {
  return (
    <Card className="bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 text-white border-0 shadow-2xl max-w-2xl mx-auto overflow-hidden">
      <div className="relative p-8">
        <div className="absolute top-4 right-4 text-yellow-300 text-2xl">⭐</div>
        <div className="absolute top-12 right-12 text-blue-300 text-lg">✨</div>
        <div className="absolute bottom-8 left-8 text-purple-300 text-xl">🌟</div>
        
        <div className="relative z-10">
          {/* Company Logo */}
          <div className="flex justify-center mb-6">
            <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-lg border border-white/20">
              <img
                src="/MTI-removebg-preview.png"
                alt="PT. Merdeka Tsingshan Indonesia"
                className="h-8 w-auto brightness-0 invert"
              />
              <div className="text-xs font-medium text-white">PT. Merdeka Tsingshan Indonesia</div>
            </div>
          </div>

          <div className="text-center mb-8">
            <div className="inline-block p-3 bg-white/10 backdrop-blur-sm rounded-full mb-4">
              <span className="text-2xl">🚀</span>
            </div>
            {photo && (
              <div className="w-28 h-28 mx-auto mb-4">
                <img
                  src={photo}
                  alt={name}
                  className="w-full h-full object-cover rounded-full border-4 border-purple-400 shadow-lg"
                />
              </div>
            )}
            <h1 className="text-4xl font-bold mb-2">
              Welcome to the galaxy, {name}!
            </h1>
            <p className="text-xl text-purple-200">
              Mission: <span className="text-yellow-300 font-semibold">{position}</span>
            </p>
          </div>
          
          <div className="bg-white/10 backdrop-blur-sm p-6 rounded-2xl border border-white/20 mb-6">
            <p className="text-white leading-relaxed text-center">{message}</p>
          </div>
          
          <div className="text-center">
            <span className="inline-block px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full text-sm font-medium">
              🌌 Ready for an out-of-this-world journey? 🌌
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
};

// Template 12: Ocean Theme
export const OceanTemplate = ({ name, position, message, photo }: TemplateProps) => {
  return (
    <Card className="bg-gradient-to-br from-blue-100 via-cyan-50 to-teal-100 border border-blue-200 shadow-xl max-w-2xl mx-auto overflow-hidden">
      <div className="relative p-8">
        <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-blue-300 to-cyan-300 rounded-full transform translate-x-20 -translate-y-20 opacity-30"></div>
        
        <div className="relative z-10">
          {/* Company Logo */}
          <div className="flex justify-center mb-6">
            <div className="flex items-center gap-3 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-xl border border-blue-200 shadow-sm">
              <img
                src="/MTI-removebg-preview.png"
                alt="PT. Merdeka Tsingshan Indonesia"
                className="h-8 w-auto"
              />
              <div className="text-xs font-medium text-blue-800">PT. Merdeka Tsingshan Indonesia</div>
            </div>
          </div>

          <div className="text-center mb-8">
            <div className="inline-block p-3 bg-white rounded-full shadow-lg mb-4">
              <span className="text-2xl">🌊</span>
            </div>
            {photo && (
              <div className="w-28 h-28 mx-auto mb-4">
                <img
                  src={photo}
                  alt={name}
                  className="w-full h-full object-cover rounded-full border-4 border-blue-300 shadow-lg"
                />
              </div>
            )}
            <h1 className="text-4xl font-bold text-blue-800 mb-2">
              Dive in, {name}!
            </h1>
            <p className="text-xl text-blue-700">
              Making waves as our new <span className="font-semibold">{position}</span>
            </p>
          </div>
          
          <div className="bg-white/70 backdrop-blur-sm p-6 rounded-2xl border border-blue-200 mb-6">
            <p className="text-blue-800 leading-relaxed text-center">{message}</p>
          </div>
          
          <div className="text-center">
            <span className="inline-block px-6 py-2 bg-blue-600 text-white rounded-full text-sm font-medium">
              🐠 Ready to make a splash? 🐠
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
};

// Template 13: Mountain Adventure
export const MountainTemplate = ({ name, position, message, photo }: TemplateProps) => {
  return (
    <Card className="bg-gradient-to-b from-slate-100 to-stone-100 border border-slate-300 shadow-xl max-w-2xl mx-auto overflow-hidden">
      <div className="relative p-8">
        <div className="absolute top-0 left-0 w-full h-20 bg-gradient-to-b from-slate-400 to-transparent opacity-20"></div>
        
        <div className="relative z-10">
          {/* Company Logo */}
          <div className="flex justify-center mb-6">
            <div className="flex items-center gap-3 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-lg border border-slate-300 shadow-sm">
              <img
                src="/MTI-removebg-preview.png"
                alt="PT. Merdeka Tsingshan Indonesia"
                className="h-8 w-auto"
              />
              <div className="text-xs font-medium text-slate-700">PT. Merdeka Tsingshan Indonesia</div>
            </div>
          </div>

          <div className="text-center mb-8">
            <div className="inline-block p-3 bg-white rounded-full shadow-lg mb-4">
              <span className="text-2xl">⛰️</span>
            </div>
            {photo && (
              <div className="w-28 h-28 mx-auto mb-4">
                <img
                  src={photo}
                  alt={name}
                  className="w-full h-full object-cover rounded-full border-4 border-slate-400 shadow-lg"
                />
              </div>
            )}
            <h1 className="text-4xl font-bold text-slate-800 mb-2">
              Reach new heights, {name}!
            </h1>
            <p className="text-xl text-slate-700">
              Climbing to success as our <span className="font-semibold">{position}</span>
            </p>
          </div>
          
          <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-slate-300 mb-6">
            <p className="text-slate-800 leading-relaxed text-center">{message}</p>
          </div>
          
          <div className="text-center">
            <span className="inline-block px-6 py-2 bg-slate-700 text-white rounded-full text-sm font-medium">
              🏔️ The summit awaits! 🏔️
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
};

// Template 14: Sunset Warm
export const SunsetTemplate = ({ name, position, message, photo }: TemplateProps) => {
  return (
    <Card className="bg-gradient-to-br from-orange-100 via-red-50 to-pink-100 border-0 shadow-xl max-w-2xl mx-auto overflow-hidden">
      <div className="relative p-8">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-orange-400 to-red-400 rounded-full transform translate-x-16 -translate-y-16 opacity-30"></div>
        
        <div className="relative z-10">
          {/* Company Logo */}
          <div className="flex justify-center mb-6">
            <div className="flex items-center gap-3 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-xl border border-orange-200 shadow-sm">
              <img
                src="/MTI-removebg-preview.png"
                alt="PT. Merdeka Tsingshan Indonesia"
                className="h-8 w-auto"
              />
              <div className="text-xs font-medium text-orange-800">PT. Merdeka Tsingshan Indonesia</div>
            </div>
          </div>

          <div className="text-center mb-8">
            <div className="inline-block p-3 bg-white rounded-full shadow-lg mb-4">
              <span className="text-2xl">🌅</span>
            </div>
            {photo && (
              <div className="w-28 h-28 mx-auto mb-4">
                <img
                  src={photo}
                  alt={name}
                  className="w-full h-full object-cover rounded-full border-4 border-orange-300 shadow-lg"
                />
              </div>
            )}
            <h1 className="text-4xl font-bold text-orange-800 mb-2">
              A bright new dawn, {name}!
            </h1>
            <p className="text-xl text-orange-700">
              Shining bright as our new <span className="font-semibold">{position}</span>
            </p>
          </div>
          
          <div className="bg-white/70 backdrop-blur-sm p-6 rounded-2xl border border-orange-200 mb-6">
            <p className="text-orange-800 leading-relaxed text-center">{message}</p>
          </div>
          
          <div className="text-center">
            <span className="inline-block px-6 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-full text-sm font-medium">
              ☀️ Your journey begins now! ☀️
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
};

// Template 15: Forest Green
export const ForestTemplate = ({ name, position, message, photo }: TemplateProps) => {
  return (
    <Card className="bg-gradient-to-br from-green-100 to-emerald-100 border border-green-300 shadow-xl max-w-2xl mx-auto overflow-hidden">
      <div className="relative p-8">
        <div className="absolute top-4 right-4 text-green-600 text-2xl">🌲</div>
        <div className="absolute bottom-4 left-4 text-green-500 text-xl">🍃</div>
        
        <div className="relative z-10">
          {/* Company Logo */}
          <div className="flex justify-center mb-6">
            <div className="flex items-center gap-3 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-xl border border-green-300 shadow-sm">
              <img
                src="/MTI-removebg-preview.png"
                alt="PT. Merdeka Tsingshan Indonesia"
                className="h-8 w-auto"
              />
              <div className="text-xs font-medium text-green-800">PT. Merdeka Tsingshan Indonesia</div>
            </div>
          </div>

          <div className="text-center mb-8">
            <div className="inline-block p-3 bg-white rounded-full shadow-lg mb-4">
              <span className="text-2xl">🌳</span>
            </div>
            {photo && (
              <div className="w-28 h-28 mx-auto mb-4">
                <img
                  src={photo}
                  alt={name}
                  className="w-full h-full object-cover rounded-full border-4 border-green-400 shadow-lg"
                />
              </div>
            )}
            <h1 className="text-4xl font-bold text-green-800 mb-2">
              Welcome to our forest, {name}!
            </h1>
            <p className="text-xl text-green-700">
              Growing strong as our new <span className="font-semibold">{position}</span>
            </p>
          </div>
          
          <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-green-300 mb-6">
            <p className="text-green-800 leading-relaxed text-center">{message}</p>
          </div>
          
          <div className="text-center">
            <span className="inline-block px-6 py-2 bg-green-700 text-white rounded-full text-sm font-medium">
              🌿 Let's grow together! 🌿
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
};

// Template 16: City Skyline
export const CityTemplate = ({ name, position, message, photo }: TemplateProps) => {
  return (
    <Card className="bg-gradient-to-b from-gray-100 to-slate-200 border border-gray-300 shadow-xl max-w-2xl mx-auto overflow-hidden">
      <div className="relative p-8">
        <div className="absolute top-0 left-0 w-full h-16 bg-gradient-to-r from-gray-400 via-slate-400 to-gray-400 opacity-20"></div>
        
        <div className="relative z-10">
          {/* Company Logo */}
          <div className="flex justify-center mb-6">
            <div className="flex items-center gap-3 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-lg border border-gray-300 shadow-sm">
              <img
                src="/MTI-removebg-preview.png"
                alt="PT. Merdeka Tsingshan Indonesia"
                className="h-8 w-auto"
              />
              <div className="text-xs font-medium text-gray-700">PT. Merdeka Tsingshan Indonesia</div>
            </div>
          </div>

          <div className="text-center mb-8">
            <div className="inline-block p-3 bg-white rounded-lg shadow-lg mb-4">
              <span className="text-2xl">🏙️</span>
            </div>
            {photo && (
              <div className="w-28 h-28 mx-auto mb-4">
                <img
                  src={photo}
                  alt={name}
                  className="w-full h-full object-cover rounded-lg border-4 border-gray-400 shadow-lg"
                />
              </div>
            )}
            <h1 className="text-4xl font-bold text-gray-800 mb-2">
              Welcome to the big city, {name}!
            </h1>
            <p className="text-xl text-gray-700">
              Building success as our new <span className="font-semibold">{position}</span>
            </p>
          </div>
          
          <div className="bg-white/90 backdrop-blur-sm p-6 rounded-lg border border-gray-300 mb-6">
            <p className="text-gray-800 leading-relaxed text-center">{message}</p>
          </div>
          
          <div className="text-center">
            <span className="inline-block px-6 py-2 bg-gray-700 text-white rounded text-sm font-medium">
              🌆 Ready to reach new heights? 🌆
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
};

// Template 17: Neon Cyber
export const CyberTemplate = ({ name, position, message, photo }: TemplateProps) => {
  return (
    <Card className="bg-black text-white border-2 border-cyan-500 shadow-2xl max-w-2xl mx-auto overflow-hidden">
      <div className="relative p-8">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500"></div>
        <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500"></div>
        
        <div className="relative z-10">
          {/* Company Logo */}
          <div className="flex justify-center mb-6">
            <div className="flex items-center gap-3 bg-black/80 backdrop-blur-sm px-4 py-2 rounded-lg border border-cyan-500 shadow-lg">
              <img
                src="/MTI-removebg-preview.png"
                alt="PT. Merdeka Tsingshan Indonesia"
                className="h-8 w-auto brightness-0 invert"
              />
              <div className="text-xs font-medium text-cyan-400">PT. Merdeka Tsingshan Indonesia</div>
            </div>
          </div>

          <div className="text-center mb-8">
            <div className="inline-block p-3 bg-cyan-500/20 border border-cyan-500 rounded mb-4">
              <span className="text-2xl">⚡</span>
            </div>
            {photo && (
              <div className="w-28 h-28 mx-auto mb-4">
                <img
                  src={photo}
                  alt={name}
                  className="w-full h-full object-cover rounded border-2 border-cyan-500 shadow-lg shadow-cyan-500/50"
                />
              </div>
            )}
            <h1 className="text-4xl font-bold mb-2 text-cyan-400">
              SYSTEM.welcome({name})
            </h1>
            <p className="text-xl text-purple-400 font-mono">
              ACCESS_LEVEL: <span className="text-pink-400">{position}</span>
            </p>
          </div>
          
          <div className="bg-gray-900/50 border border-cyan-500/50 p-6 rounded mb-6 font-mono">
            <div className="text-cyan-400 text-sm mb-2">&gt; WELCOME_MESSAGE.exe</div>
            <p className="text-white leading-relaxed">{message}</p>
          </div>
          
          <div className="text-center">
            <span className="inline-block px-6 py-2 bg-gradient-to-r from-cyan-500 to-purple-500 text-black rounded text-sm font-bold">
              ⚡ READY TO HACK THE FUTURE? ⚡
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
};

// Template 18: Watercolor Art
export const WatercolorTemplate = ({ name, position, message, photo }: TemplateProps) => {
  return (
    <Card className="bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 border-0 shadow-xl max-w-2xl mx-auto overflow-hidden">
      <div className="relative p-8">
        <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-purple-200 to-pink-200 rounded-full transform translate-x-20 -translate-y-20 opacity-50 blur-xl"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-blue-200 to-purple-200 rounded-full transform -translate-x-16 translate-y-16 opacity-50 blur-xl"></div>
        
        <div className="relative z-10">
          {/* Company Logo */}
          <div className="flex justify-center mb-6">
            <div className="flex items-center gap-3 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-lg border border-purple-200 shadow-sm">
              <img
                src="/MTI-removebg-preview.png"
                alt="PT. Merdeka Tsingshan Indonesia"
                className="h-8 w-auto"
              />
              <div className="text-xs font-medium text-purple-700">PT. Merdeka Tsingshan Indonesia</div>
            </div>
          </div>

          <div className="text-center mb-8">
            <div className="inline-block p-3 bg-white/80 backdrop-blur-sm rounded-full shadow-lg mb-4">
              <span className="text-2xl">🎨</span>
            </div>
            {photo && (
              <div className="w-28 h-28 mx-auto mb-4">
                <img
                  src={photo}
                  alt={name}
                  className="w-full h-full object-cover rounded-full border-4 border-white shadow-xl"
                />
              </div>
            )}
            <h1 className="text-4xl font-bold text-purple-800 mb-2">
              Create magic, {name}!
            </h1>
            <p className="text-xl text-purple-700">
              Painting success as our new <span className="font-semibold">{position}</span>
            </p>
          </div>
          
          <div className="bg-white/60 backdrop-blur-sm p-6 rounded-3xl border border-white/40 mb-6">
            <p className="text-purple-800 leading-relaxed text-center">{message}</p>
          </div>
          
          <div className="text-center">
            <span className="inline-block px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full text-sm font-medium">
              🌈 Let's create something beautiful! 🌈
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
};

// Template 19: Classic Newspaper
export const NewspaperTemplate = ({ name, position, message, photo }: TemplateProps) => {
  return (
    <Card className="bg-gray-50 border-2 border-gray-800 shadow-xl max-w-2xl mx-auto">
      <div className="p-8">
        {/* Company Logo */}
        <div className="flex justify-center mb-6">
          <div className="flex items-center gap-3 bg-white px-4 py-2 rounded border-2 border-gray-800">
            <img
              src="/MTI-removebg-preview.png"
              alt="PT. Merdeka Tsingshan Indonesia"
              className="h-8 w-auto"
            />
            <div className="text-xs font-bold text-gray-800">PT. Merdeka Tsingshan Indonesia</div>
          </div>
        </div>

        <div className="border-b-4 border-gray-800 pb-4 mb-6">
          <h1 className="text-4xl font-bold text-center text-gray-900 font-serif">
            THE COMPANY HERALD
          </h1>
          <p className="text-center text-sm text-gray-600 mt-2">
            {new Date().toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </div>
        
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 font-serif text-center">
            NEW TEAM MEMBER JOINS OUR RANKS
          </h2>
          
          <div className="flex gap-6">
            {photo && (
              <div className="w-24 h-24 flex-shrink-0">
                <img
                  src={photo}
                  alt={name}
                  className="w-full h-full object-cover border-2 border-gray-800"
                />
              </div>
            )}
            <div className="flex-1">
              <h3 className="text-xl font-bold text-gray-900 mb-2 font-serif">
                {name}
              </h3>
              <p className="text-lg text-gray-700 mb-2 font-serif">
                {position}
              </p>
              <p className="text-gray-700 leading-relaxed text-justify font-serif">
                {message}
              </p>
            </div>
          </div>
        </div>
        
        <div className="border-t-2 border-gray-800 pt-4 text-center">
          <span className="text-sm text-gray-600 font-serif italic">
            "Excellence in journalism since 1985"
          </span>
        </div>
      </div>
    </Card>
  );
};

// Template 20: Polaroid Photo
export const PolaroidTemplate = ({ name, position, message, photo }: TemplateProps) => {
  const handwritingStyle = {
    fontFamily: "'Kalam', cursive",
    transform: 'rotate(-1deg)'
  };

  return (
    <Card className="bg-white border border-gray-300 shadow-2xl max-w-2xl mx-auto overflow-hidden transform rotate-1">
      <div className="p-8">
        {/* Company Logo */}
        <div className="flex justify-center mb-6">
          <div className="flex items-center gap-3 bg-gray-50 px-4 py-2 rounded border border-gray-300 shadow-sm">
            <img
              src="/MTI-removebg-preview.png"
              alt="PT. Merdeka Tsingshan Indonesia"
              className="h-8 w-auto"
            />
            <div className="text-xs font-medium text-gray-700">PT. Merdeka Tsingshan Indonesia</div>
          </div>
        </div>

        <div className="bg-white p-6 border-8 border-white shadow-lg mb-6 transform -rotate-1">
          {photo ? (
            <img
              src={photo}
              alt={name}
              className="w-full h-64 object-cover"
            />
          ) : (
            <div className="w-full h-64 bg-gray-200 flex items-center justify-center">
              <span className="text-6xl">📸</span>
            </div>
          )}
          <div className="bg-white pt-4">
            <p style={handwritingStyle} className="text-gray-800 text-lg text-center">
              Welcome {name}! 📷
            </p>
          </div>
        </div>
        
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Capturing memories with {name}
          </h1>
          <p className="text-xl text-gray-700">
            Our new <span className="font-semibold">{position}</span>
          </p>
        </div>
        
        <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 mb-6">
          <p className="text-gray-800 leading-relaxed text-center">{message}</p>
        </div>
        
        <div className="text-center">
          <span className="inline-block px-6 py-2 bg-gray-800 text-white rounded text-sm font-medium">
            📸 Picture perfect addition to our team! 📸
          </span>
        </div>
      </div>
    </Card>
  );
};

// Export all templates
export const templates = [
  { name: "Modern Gradient", component: ModernTemplate },
  { name: "Corporate Professional", component: CorporateTemplate },
  { name: "Creative Colorful", component: CreativeTemplate },
  { name: "Minimalist Clean", component: MinimalistTemplate },
  { name: "Tech Startup", component: TechTemplate },
  { name: "Elegant Formal", component: ElegantTemplate },
  { name: "Playful Fun", component: PlayfulTemplate },
  { name: "Nature Inspired", component: NatureTemplate },
  { name: "Geometric Modern", component: GeometricTemplate },
  { name: "Retro Vintage", component: RetroTemplate },
  { name: "Space Theme", component: SpaceTemplate },
  { name: "Ocean Theme", component: OceanTemplate },
  { name: "Mountain Adventure", component: MountainTemplate },
  { name: "Sunset Warm", component: SunsetTemplate },
  { name: "Forest Green", component: ForestTemplate },
  { name: "City Skyline", component: CityTemplate },
  { name: "Neon Cyber", component: CyberTemplate },
  { name: "Watercolor Art", component: WatercolorTemplate },
  { name: "Classic Newspaper", component: NewspaperTemplate },
  { name: "Polaroid Photo", component: PolaroidTemplate },
];